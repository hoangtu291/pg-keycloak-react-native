import { RNKeycloak } from '@react-keycloak/native';

// Setup Keycloak instance as needed
// Pass initialization options as required
const keycloak = new RNKeycloak({
    url: 'http://103.221.220.183:8880',
    realm: 'iotlab',
    clientId: 'iotlab',
});

export default keycloak;