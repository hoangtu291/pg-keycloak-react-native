import axios from 'axios';
import { AuthenticatorFactory, KeycloakConfig } from './authenticator';
import { AuthenticatorService } from './authenticatorService';

const keycloakConfig = {
  url: 'http://103.221.220.183:8880',
  realm: 'iotlab',
  clientId: 'iotlab',
} as KeycloakConfig;
// export var auth: KeycloakAuthenticator
export const authMiddleware = async () => {

  const authenticator = await AuthenticatorFactory.getAuthenticator(axios, keycloakConfig);
  try {
    await authenticator.authenticate();
  } catch (error) {
    console.log(error);

  }
  AuthenticatorService.createInstance(authenticator);
  return authenticator;
};
