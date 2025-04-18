import { RNKeycloak } from '@react-keycloak/native';
import { AxiosStatic } from 'axios';
import { jwtDecode } from 'jwt-decode';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const globalInstanceKey = '__GLOBAL_KEYCLOAK_AUTH__';

/**
 * Support for both web and native environments
 */
export interface Authenticator {
  authenticate(tokenHolder: TokenHolder, redirectUri?: string): Promise<boolean>;
  refreshToken(tokenHolder: TokenHolder): Promise<string>;
  logout(tokenHolder: TokenHolder, redirectUri?: string): Promise<boolean>;
  getUserInformation(tokenHolder: TokenHolder): UserInformation | undefined;
  getToken(): string | undefined;
}

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export interface UserInformation {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export class AuthenticatorFactory {
  static async getAuthenticator(axios: AxiosStatic, config: KeycloakConfig): Promise<KeycloakAuthenticator> {
    if (!(globalThis as any)[globalInstanceKey]) {
      (globalThis as any)[globalInstanceKey] = new KeycloakAuthenticatorImpl(config, axios);
    }
    return (globalThis as any)[globalInstanceKey];
  }
}

class TokenHolder {
  token: string | undefined;
  refreshToken: string | undefined;
  parsedToken: any | undefined;

  setToken(token: string, refreshToken: string) {
    this.token = token;
    this.refreshToken = refreshToken;
    this.parsedToken = jwtDecode(token);
  }

  clearToken() {
    this.token = undefined;
    this.refreshToken = undefined;
    this.parsedToken = undefined;
  }
}

export interface KeycloakAuthenticator {
  authenticate(minTokenValidity?: number, redirectUri?: string): Promise<boolean>;
  logout(redirectUri?: string): Promise<boolean>;
  getUserInformation(): UserInformation | undefined;
  getToken(): string | undefined;
}

class KeycloakAuthenticatorImpl implements KeycloakAuthenticator {
  private tokenHolder: TokenHolder = new TokenHolder();
  private keycloak: RNKeycloak;
  private axios: AxiosStatic;
  private authenticator: Authenticator | undefined;

  constructor(keycloakConfig: KeycloakConfig, axios: AxiosStatic) {
    this.axios = axios;
    this.keycloak = new RNKeycloak({
      url: keycloakConfig.url,
      realm: keycloakConfig.realm,
      clientId: keycloakConfig.clientId,
    });
    this.addInterceptor();
    this.addResponseInterceptor();
  }

  /**
   *
   * @param minTokenValidity minimum token validity in seconds. Default is 30 seconds
   * @param redirectUri redirect uri to redirect after authentication required for native app
   * @returns
   */
  authenticate(minTokenValidity?: number, redirectUri?: string): Promise<boolean> {
    if (this.tokenHolder.token) {
      return Promise.reject('Authenticated already');
    }
    this.authenticator = new AuthenticatorImpl(this.keycloak, minTokenValidity);
    return this.authenticator.authenticate(this.tokenHolder, redirectUri);
  }

  logout(redirectUri?: string): Promise<boolean> {
    if (!this.authenticator) {
      return Promise.reject('Not authenticated');
    }
    return this.authenticator.logout(this.tokenHolder, redirectUri);
  }

  getUserInformation(): UserInformation | undefined {
    if (!this.authenticator) {
      return undefined;
    }
    return this.authenticator.getUserInformation(this.tokenHolder);
  }

  getToken(): string | undefined {
    if (!this.authenticator) {
      return undefined;
    }
    return this.authenticator.getToken();
  }

  private addInterceptor(): void {
    this.axios.interceptors.request.use(request => {
      const token = this.tokenHolder.token;
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    });
  }

  private addResponseInterceptor(): void {
    this.axios.interceptors.response.use(response => {
      return response;
    }, error => {
      if (error.response.status === 401) {
        console.log('Token expired. Refreshing token');
        return this.authenticator?.refreshToken(this.tokenHolder).then(() => {
          return this.axios.request(error.config);
        });
      }
      return Promise.reject(error);
    });
  }
}


class AuthenticatorImpl implements Authenticator {
  private keycloak: RNKeycloak;
  private minTokenValidity: number;

  constructor(keycloak: RNKeycloak, minTokenValidity: number = 30) {
    this.keycloak = keycloak;
    this.minTokenValidity = minTokenValidity;
  }

  /**
   * Authenticate with keycloak and set the token and refresh token in the token holder
   * Reject if the authentication fails
   *
   * @param tokenHolder token holder to store the token and refresh token
   * @param redirectUri redirect uri to redirect after authentication required for native app
   * @returns  Promise<boolean> true if the authentication is successful
   */
  authenticate(tokenHolder: TokenHolder, redirectUri?: string): Promise<boolean> {
    if (!redirectUri) {
      return Promise.reject('Redirect URI is required for native environment');
    }
    return new Promise((resolve, reject) => {
      this.keycloak.init({ onLoad: 'check-sso', redirectUri: redirectUri }).then(async (authenticated: boolean) => {
        if (authenticated) {
          console.log('Authentication successfully');
          if (this.keycloak.token && this.keycloak.refreshToken) {
            tokenHolder.setToken(this.keycloak.token, this.keycloak.refreshToken);
            resolve(authenticated);
          }
          else {
            reject('Failed to authenticate with Keycloak');
          }
        } else {
          await this.keycloak.login({ redirectUri: redirectUri });
          if (this.keycloak.token && this.keycloak.refreshToken) {
            tokenHolder.setToken(this.keycloak.token, this.keycloak.refreshToken);
            resolve(authenticated);
          }
        }
      });
    });
  }

  /**
   * Refresh the token and set the new token in the token holder
   * Reject if the refresh token fails
   *
   * @param tokenHolder token holder to store the token and refresh token
   * @returns Promise<string> new token
   */
  refreshToken(tokenHolder: TokenHolder): Promise<string> {
    return new Promise((resolve, reject) => {
      this.keycloak.updateToken(this.minTokenValidity).then((refreshed: boolean) => {
        if (refreshed) {
          console.log('Token refreshed successfully');
          if (this.keycloak.token && this.keycloak.refreshToken) {
            tokenHolder.setToken(this.keycloak.token, this.keycloak.refreshToken);
            resolve(this.keycloak.token);
          }
        } else {
          console.debug('Token still valid');
        }
      }).catch((error: any) => {
        console.error('Failed to refresh token');
        reject(error);
      });
    });
  }

  /**
   * Logout the user and clear the token holder
   *
   * @param tokenHolder token holder to store the token and refresh token
   * @param redirectUri redirect uri to redirect after logout required for native app
   * @returns Promise<boolean> true if the logout is successful
   */
  logout(tokenHolder: TokenHolder, redirectUri: string = '/'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const logoutUrl = this.keycloak.createLogoutUrl();
      const updatedLogoutUrl = logoutUrl
        .replace(/redirect_uri=[^&]+/, `post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`)
        + `?client_id=${encodeURIComponent(this.keycloak.clientId ?? '')}`
        + `&id_token_hint=${encodeURIComponent(this.keycloak.idToken ?? '')}`;
      InAppBrowser.open(updatedLogoutUrl).then(() => {
        tokenHolder.clearToken();
        resolve(true);
      }).catch((error: any) => {
        console.error('Failed to logout', error);
        tokenHolder.clearToken();
        reject(error);
      });
    });
  }

  /**
   * Get user information from the token
   *
   * @param tokenHolder token holder to store the token and refresh token
   * @returns UserInformation | undefined
   */
  getUserInformation(tokenHolder: TokenHolder): UserInformation | undefined {
    if (tokenHolder.parsedToken) {
      const defaultRoles = [
        'uma_authorization',
        'offline_access',
      ];

      const filteredRoles = (tokenHolder.parsedToken.realm_access?.roles || []).filter((role: string) => !defaultRoles.includes(role) && !role.startsWith('default-roles'));

      return {
        username: tokenHolder.parsedToken.preferred_username,
        email: tokenHolder.parsedToken.email,
        firstName: tokenHolder.parsedToken.given_name,
        lastName: tokenHolder.parsedToken.family_name,
        roles: filteredRoles,
      };
    }
    return undefined;
  }

  /**
   * Get the token from the token holder
   *
   * @returns string | undefined
   */
  getToken(): string | undefined {
    return this.keycloak.token;
  }
}
