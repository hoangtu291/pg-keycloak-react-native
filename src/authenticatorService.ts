import { KeycloakAuthenticator } from './authenticator';

export class AuthenticatorService {
  private static INSTANCE: AuthenticatorService;

  private authenticator: KeycloakAuthenticator | undefined;
  private authenticated: boolean;

  private constructor(authenticator?: KeycloakAuthenticator, authenticated = false) {
    this.authenticator = authenticator;
    this.authenticated = authenticated;
  }

  public static createInstance(authenticator?: KeycloakAuthenticator): AuthenticatorService {
    if (AuthenticatorService.INSTANCE) {
      return AuthenticatorService.INSTANCE;
    }
    if (!authenticator) {
      AuthenticatorService.INSTANCE = new AuthenticatorService(authenticator, false);
      return AuthenticatorService.INSTANCE;
    }
    AuthenticatorService.INSTANCE = new AuthenticatorService(authenticator, !!authenticator.getToken());
    return AuthenticatorService.INSTANCE;
  }
  public static getInstance(): AuthenticatorService {
    return AuthenticatorService.INSTANCE;
  }

  public getAuthenticator(): KeycloakAuthenticator | undefined {
    return this.authenticator;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }
}
