/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  AppRegistry,
  Button,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import { KeycloakProvider } from './src/KeycloakProvider';
import { AuthenticatorService } from './src/authenticatorService';
import { useNavigation } from '@react-navigation/native';
import { UserInformation } from './src/authenticator';

// Đăng ký ứng dụng chính
AppRegistry.registerComponent('App', () => App);
type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({ children, title }: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function Info({ reload }: { reload: () => void }): React.JSX.Element {
  const [info, setInfo] = useState<UserInformation | undefined>();
  const authenticator = AuthenticatorService.getInstance()?.getAuthenticator();
  useEffect(() => {
    setInfo(authenticator?.getUserInformation());
  }, [authenticator]);

  const handleLogout = async () => {
    try {

      if (authenticator) {
        await authenticator.logout('test-auth://callback');
        reload();
      } else {
        console.error('Authenticator không có sẵn');
      }
    } catch (error) {
      console.error('Lỗi khi logout:', error);
    }
  };
  return (
    <View style={styles.sectionContainer}>
      <Section title="Step One">
        Hello <Text style={styles.highlight}>{info?.username}</Text> {'\n'}
        <Button title="Logout" onPress={handleLogout} />
      </Section>
      <Section title="Information">
        First name: <Text style={styles.highlight}>{info?.firstName}</Text> {'\n'}
        Last name: <Text style={styles.highlight}>{info?.lastName}</Text> {'\n'}
        Roles: <Text style={styles.highlight}>{info?.roles.join(', ')}</Text> {'\n'}
        Email: <Text style={styles.highlight}>{info?.email}</Text> {'\n'}
      </Section>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [key, setKey] = useState(0);

  const reloadComponent = () => {
    setKey(prevKey => prevKey + 1);
  };
  useEffect(() => {
    console.log('key', key);
  }, [key]);

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the reccomendation is to use `react-native-safe-area-context`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = '5%';
  return (
    <KeycloakProvider
      key={key}
    >
      <View style={backgroundStyle}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={backgroundStyle.backgroundColor}
        />
        <ScrollView
          style={backgroundStyle}>
          <View style={{ paddingRight: safePadding }}>
            <Header />
          </View>
          <View
            style={{
              backgroundColor: isDarkMode ? Colors.black : Colors.white,
              paddingHorizontal: safePadding,
              paddingBottom: safePadding,
            }}>
            <Info reload={reloadComponent} />
            <LearnMoreLinks />
          </View>
        </ScrollView>
      </View>
    </KeycloakProvider>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
