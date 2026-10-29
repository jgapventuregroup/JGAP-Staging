#!/usr/bin/env python3
"""Isolated PostgreSQL concurrency acceptance; never connects to hosted services.

Test-only driver: psycopg2-binary==2.9.11; optional local runtime pgserver==0.1.4.
CI uses only the fixed disposable PostgreSQL 17 service, never a hosted DSN.
Creates a fresh temporary cluster with Unix sockets only, installs repository
SQL, exercises competing transactions, and stops its own cluster in finally.
Auth is the local SQL identity contract, not real Supabase JWT verification.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import tempfile
import os
import time

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
OWNER = '85000000-0000-4000-8000-000000000001'
OTHER = '85000000-0000-4000-8000-000000000002'
THIRD = '85000000-0000-4000-8000-000000000003'
COMPANY = '85000000-0000-4000-8000-000000000011'
TEAM = 'select public.manage_workspace_team(%s,%s,%s,%s,%s)'


def execute(connection, sql, args=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, args if args else None)
        return cursor.fetchall() if cursor.description else []


def identity(connection, actor):
    execute(connection, 'select set_config(\'request.jwt.claim.sub\',%s,false)', (actor,))
    execute(connection, 'set role authenticated')
    connection.commit()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence', type=Path)
    parser.add_argument('--ci-local', action='store_true', help='Use only the fixed ephemeral GitHub Actions PostgreSQL service')
    args = parser.parse_args()
    # The caller cannot supply a DSN, host, existing project, or existing data dir.
    server = None
    if args.ci_local:
        assert os.environ.get('GITHUB_ACTIONS') == 'true', 'CI mode requires GitHub Actions'
        # These are public disposable test credentials, never a hosted DSN.
        uri = 'host=127.0.0.1 port=54329 dbname=jgap_concurrency user=postgres password=local-test-only connect_timeout=5'
    else:
        import pgserver
        directory = Path(tempfile.mkdtemp(prefix='jgap-concurrency-'))
        server = pgserver.get_server(directory, cleanup_mode='stop')
        uri = server.get_uri()
    connections = []
    evidence = {'date': '2026-10-29', 'runtime': {}, 'checks': [],
                'scope': 'Fresh local PostgreSQL cluster; repository SQL, two real concurrent connections; simulated Auth identity only.',
                'limits': ['Not hosted Supabase, real JWT/browser revocation, phone, or single-session Auth enforcement.',
                           'PostgreSQL version is recorded; repeat against the approved hosted candidate before final platform acceptance.']}
    try:
        admin = psycopg2.connect(uri)
        connections.append(admin)
        admin.autocommit = True
        evidence['runtime']['postgresql'] = execute(admin, 'show server_version')[0][0]
        if not args.ci_local:
            assert execute(admin, 'show listen_addresses')[0][0] == '', 'Must not listen on network interfaces'
        else:
            assert execute(admin, 'select current_database()')[0][0] == 'jgap_concurrency'
            assert execute(admin, 'show server_version_num')[0][0].startswith('17'), 'CI must use PostgreSQL 17'
        for file in ['tests/database-platform-fixture.sql', 'supabase/baseline/application-schema.sql',
                     'supabase/features/team-controls.sql', 'supabase/features/team-seats.sql']:
            execute(admin, (ROOT / file).read_text())
        execute(admin, '''insert into auth.users values(%s,'owner@example.invalid',now()),
            (%s,'second@example.invalid',now()),(%s,'third@example.invalid',now());
            insert into public.companies(id,name) values(%s,'Local concurrency only');
            insert into public.company_members(company_id,user_id,role) values(%s,%s,'owner');
            update public.company_subscriptions set plan='pro',billing_status='active';
            insert into public.company_team_seats(company_id,additional_seats,valid_until) values(%s,1,now()+interval '1 day');''',
            (OWNER, OTHER, THIRD, COMPANY, COMPANY, OWNER, COMPANY))
        first, second = psycopg2.connect(uri), psycopg2.connect(uri)
        connections += [first, second]
        for connection in [first, second]:
            execute(connection, "set statement_timeout='8s';set lock_timeout='6s'")
            connection.commit()
        first_pid = execute(first, 'select pg_backend_pid()')[0][0]
        second_pid = execute(second, 'select pg_backend_pid()')[0][0]
        first.commit(); second.commit()

        def compete(name, actor_first, first_sql, first_args, actor_second, second_sql, second_args, expected_message, expected_code='22023'):
            identity(first, actor_first)
            identity(second, actor_second)
            execute(first, first_sql, first_args)  # Leave mutation uncommitted.
            try:
                with ThreadPoolExecutor(max_workers=1) as pool:
                    future = pool.submit(execute, second, second_sql, second_args)
                    blocked = False
                    deadline = time.monotonic() + 4
                    while time.monotonic() < deadline:
                        blockers = execute(admin, 'select pg_blocking_pids(%s)', (second_pid,))[0][0]
                        if first_pid in blockers:
                            blocked = True
                            break
                        if future.done():
                            break
                        time.sleep(0.02)
                    if not blocked:
                        first.rollback()
                        # Join before touching the second connection again.
                        try:
                            future.result(timeout=9)
                        except psycopg2.Error:
                            pass
                        raise AssertionError(name + ': second request did not wait for first transaction')
                    first.commit()
                    try:
                        future.result(timeout=9)
                    except psycopg2.Error as error:
                        assert error.pgcode == expected_code, (name, error.pgcode, str(error))
                        assert expected_message in str(error), (name, str(error))
                    else:
                        raise AssertionError(name + ': both competing requests unexpectedly succeeded')
                    finally:
                        second.rollback()
            finally:
                first.rollback()
            evidence['checks'].append({'name': name, 'outcome': 'PASS',
                'observed': 'Second backend was blocked by first backend; after commit it re-evaluated state and safely refused the losing operation.'})

        compete('two invitations for one remaining seat', OWNER, TEAM,
                ('invite', COMPANY, None, 'second@example.invalid', 'viewer'), OWNER, TEAM,
                ('invite', COMPANY, None, 'third@example.invalid', 'editor'), 'No paid team seat')
        assert execute(admin, "select count(*) from public.company_invitations where status='pending'")[0][0] == 1
        invitation = execute(admin, 'select id from public.company_invitations')[0][0]
        compete('two accepts of the same invitation', OTHER, TEAM,
                ('accept', COMPANY, invitation, None, None), OTHER, TEAM,
                ('accept', COMPANY, invitation, None, None), 'Invitation unavailable', '42501')
        assert execute(admin, 'select count(*) from public.company_members')[0][0] == 2
        execute(admin, "update public.company_members set role='owner' where user_id=%s", (OTHER,))
        compete('two owners demote themselves concurrently', OWNER, TEAM,
                ('role', COMPANY, OWNER, None, 'viewer'), OTHER, TEAM,
                ('role', COMPANY, OTHER, None, 'viewer'), 'Keep at least one workspace owner')
        assert execute(admin, "select count(*) from public.company_members where role='owner'")[0][0] == 1
        # Retained viewer is removed only in this fresh local disposable cluster.
        execute(admin, 'delete from public.company_members where user_id=%s', (OWNER,))
        compete('seat reduction wins against an invitation in flight', OTHER,
                'reset role;update public.company_team_seats set additional_seats=0 where company_id=%s',
                (COMPANY,), OTHER, TEAM,
                ('invite', COMPANY, None, 'third@example.invalid', 'viewer'), 'No paid team seat')
        assert execute(admin, "select count(*) from public.company_invitations where status='pending'")[0][0] == 0
        assert execute(admin, 'select count(*) from public.company_members')[0][0] == 1
        evidence['outcome'] = 'PASS'
    finally:
        for connection in reversed(connections):
            connection.close()
        if server is not None:
            server.cleanup()
    evidence['cleanup'] = 'All test connections closed; ephemeral cluster is stopped locally or destroyed by the CI service lifecycle. No hosted changes or external messages.'
    if args.evidence:
        args.evidence.write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps(evidence, indent=2))


if __name__ == '__main__':
    main()
