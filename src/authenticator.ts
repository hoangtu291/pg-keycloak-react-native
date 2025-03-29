import { RNKeycloak } from '@react-keycloak/native';
import { AxiosStatic } from 'axios';
import { jwtDecode } from 'jwt-decode'; // For decoding JWT token
import InAppBrowser from 'react-native-inappbrowser-reborn';

export interface Authenticator {
  authenticate(tokenHolder: TokenHolder): Promise<boolean>;
  refreshToken(tokenHolder: TokenHolder): Promise<string>;
  logout(tokenHolder: TokenHolder, redirectUrl?: string): Promise<boolean>;
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
}

export class AuthenticatorFactory {
  private static authenticatorInstance: KeycloakAuthenticator | undefined;

  static async getAuthenticator(axios: AxiosStatic, config: KeycloakConfig): Promise<KeycloakAuthenticator> {
    if (!AuthenticatorFactory.authenticatorInstance) {
      AuthenticatorFactory.authenticatorInstance = new KeycloakAuthenticatetorImpl(config, axios);
      return new Promise((resolve) => {
        AuthenticatorFactory.authenticatorInstance && resolve(AuthenticatorFactory.authenticatorInstance);
      });
    } else {
      return new Promise((resolve) => {
        AuthenticatorFactory.authenticatorInstance && resolve(AuthenticatorFactory.authenticatorInstance);
      });
    }
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
  authenticate(minTokenValidity?: number): Promise<boolean>;
  logout(redirectUrl?: string): Promise<boolean>;
  getUserInformation(): UserInformation | undefined;
  getToken(): string | undefined;
}

class KeycloakAuthenticatetorImpl implements KeycloakAuthenticator {
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

  authenticate(minTokenValidity?: number): Promise<boolean> {
    if (this.tokenHolder.token) {
      return Promise.reject('Authenticated already');
    }
    this.authenticator = new AuthenticatorImpl(this.keycloak, minTokenValidity);
    return this.authenticator.authenticate(this.tokenHolder);
  }

  logout(redirectUrl?: string): Promise<boolean> {
    if (!this.authenticator) {
      return Promise.reject('Not authenticated');
    }
    return this.authenticator.logout(this.tokenHolder, redirectUrl);
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
   * @returns  Promise<boolean> true if the authentication is successful
   */
  authenticate(tokenHolder: TokenHolder): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.keycloak.init({ onLoad: 'check-sso', redirectUri: 'test-auth://callback' }).then(async (authenticated: boolean) => {
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
          await this.keycloak.login({ redirectUri: 'test-auth://callback' });
          reject('Failed to authenticate with Keycloak');
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
   * @returns Promise<boolean> true if the logout is successful
   */
  logout(tokenHolder: TokenHolder, redirectUrl: string = '/'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // this.keycloak.logout({ redirectUri: redirectUrl }).then(() => {
      //   tokenHolder.clearToken();
      //   resolve(true);
      // }).catch((error: any) => {
      //   console.error('Failed to logout');
      //   tokenHolder.clearToken();
      //   reject(error);
      // });
      const logoutUrl = this.keycloak.createLogoutUrl();

      // Thêm các tham số mới vào logout URL
      const updatedLogoutUrl = logoutUrl
        .replace('redirect_uri=', 'post_logout_redirect_uri=')
        + `?client_id=${encodeURIComponent(this.keycloak.clientId ?? '')}`
        + `&id_token_hint=${encodeURIComponent(this.keycloak.idToken ?? '')}`;

      InAppBrowser.open(updatedLogoutUrl).then(() => {
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
      return {
        username: tokenHolder.parsedToken.preferred_username,
        email: tokenHolder.parsedToken.email,
        firstName: tokenHolder.parsedToken.given_name,
        lastName: tokenHolder.parsedToken.family_name,
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

// export interface Authenticator {
//   authenticate(): Promise<boolean>;
//   refreshToken(): Promise<string>;
//   logout(redirectUrl?: string): Promise<boolean>;
//   getUserInformation(): UserInformation | undefined;
//   getToken(): string | undefined;
// }

// export interface UserInformation {
//   username: string;
//   email: string;
//   firstName: string;
//   lastName: string;
// }

// export interface KeycloakConfig {
//   url: string;
//   realm: string;
//   clientId: string;
// }

// export class AuthenticatorFactory {
//   private static authenticatorInstance: KeycloakAuthenticator | undefined;

//   static async getAuthenticator(axios: AxiosStatic, config: KeycloakConfig): Promise<KeycloakAuthenticator> {
//     if (!AuthenticatorFactory.authenticatorInstance) {
//       AuthenticatorFactory.authenticatorInstance = new KeycloakAuthenticatorImpl(config, axios);
//       return new Promise((resolve) => {
//         AuthenticatorFactory.authenticatorInstance && resolve(AuthenticatorFactory.authenticatorInstance);
//       });
//     } else {
//       return new Promise((resolve) => {
//         AuthenticatorFactory.authenticatorInstance && resolve(AuthenticatorFactory.authenticatorInstance);
//       });
//     }
//   }
// }

// class TokenHolder {
//   token: string | undefined;
//   refreshToken: string | undefined;
//   parsedToken: any | undefined;

//   setToken(token: string, refreshToken: string) {
//     this.token = token;
//     this.refreshToken = refreshToken;
//     this.parsedToken = jwtDecode(token);
//   }

//   clearToken() {
//     this.token = undefined;
//     this.refreshToken = undefined;
//     this.parsedToken = undefined;
//   }
// }

// export interface KeycloakAuthenticator {
//   authenticate(): Promise<boolean>;
//   logout(redirectUrl?: string): Promise<boolean>;
//   getUserInformation(): UserInformation | undefined;
//   getToken(): string | undefined;
// }

// class KeycloakAuthenticatorImpl implements KeycloakAuthenticator {
//   private tokenHolder: TokenHolder = new TokenHolder();
//   private axios: AxiosStatic;
//   private keycloakConfig: KeycloakConfig;

//   constructor(keycloakConfig: KeycloakConfig, axios: AxiosStatic) {
//     this.keycloakConfig = keycloakConfig;
//     this.axios = axios;
//   }

//   authenticate(): Promise<boolean> {
//     return new Promise(async (resolve, reject) => {
//       // Initialize the Keycloak client
//       const keycloak = new RNKeycloak({
//         url: this.keycloakConfig.url,
//         realm: this.keycloakConfig.realm,
//         clientId: this.keycloakConfig.clientId,
//       });
//       // Initialize Keycloak instance and authenticate
//       try {
//         keycloak.init({onLoad: 'login-required', redirectUri:'test-auth://callback'})
//           .then(async (authenticated: boolean) => {
//             if (authenticated) {
//               console.log('Authenticated successfully with Keycloak');
//               if (keycloak.token && keycloak.refreshToken) {
//                 this.tokenHolder.setToken(keycloak.token, keycloak.refreshToken);
//                 resolve(true);
//               } else {
//                 reject('Failed to authenticate with Keycloak');
//               }
//             } else {
//               reject('Failed to authenticate with Keycloak');
//             }
//           })
//           .catch((error) => reject(error));
//       } catch (error) {
//         console.log(error);

//       }
//     });
//   }

//   logout(redirectUrl: string = '/'): Promise<boolean> {
//     return new Promise((resolve, reject) => {
//       const keycloak = new RNKeycloak({
//         url: this.keycloakConfig.url,
//         realm: this.keycloakConfig.realm,
//         clientId: this.keycloakConfig.clientId,
//       });

//       keycloak.logout({ redirectUri: redirectUrl })
//         .then(() => {
//           this.tokenHolder.clearToken();
//           resolve(true);
//         })
//         .catch((error) => {
//           console.error('Error during logout', error);
//           this.tokenHolder.clearToken();
//           reject(error);
//         });
//     });
//   }

//   getUserInformation(): UserInformation | undefined {
//     if (this.tokenHolder.parsedToken) {
//       return {
//         username: this.tokenHolder.parsedToken.preferred_username,
//         email: this.tokenHolder.parsedToken.email,
//         firstName: this.tokenHolder.parsedToken.given_name,
//         lastName: this.tokenHolder.parsedToken.family_name,
//       };
//     }
//     return undefined;
//   }

//   getToken(): string | undefined {
//     return this.tokenHolder.token;
//   }
// }
