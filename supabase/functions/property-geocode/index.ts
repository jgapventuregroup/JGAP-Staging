import {createPropertyGeocoder} from './handler.mjs';
Deno.serve(createPropertyGeocoder({
 baseUrl:Deno.env.get('SUPABASE_URL'),anonKey:Deno.env.get('SUPABASE_ANON_KEY'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
 providerUrl:Deno.env.get('PROPERTY_GEOCODER_URL')||'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress',
 origins:(Deno.env.get('PROPERTY_MAP_ORIGINS')||'https://jgapventuregroup.github.io').split(',').map(value=>value.trim()).filter(Boolean)
}));
