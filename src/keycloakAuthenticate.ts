import axios from 'axios';
import { AuthenticatorService } from './authenticatorService';
// import { AuthenticatorFactory, KeycloakConfig } from './authenticator';
import { AuthenticatorFactory, KeycloakConfig } from '@com.ctu.iotlab/authenticator/native';

const keycloakConfig = {
  url: 'http://103.221.220.183:8880',
  realm: 'iotlab',
  clientId: 'iotlab',
} as KeycloakConfig;
// export var auth: KeycloakAuthenticator
export const authMiddleware = async () => {

  const authenticator = await AuthenticatorFactory.getAuthenticator(axios, keycloakConfig);
  try {
    await authenticator.authenticate(30, 'test-auth://callback');
    console.log('authenticator', authenticator);
    AuthenticatorService.createInstance(authenticator);
  } catch (error) {
    console.log(error);

  }
  AuthenticatorService.createInstance(authenticator);
  console.log(authenticator.getUserInformation());
  return authenticator;
};
