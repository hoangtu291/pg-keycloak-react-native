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

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [key, setKey] = useState(0);

  // Hàm gọi khi muốn reload lại component
  const reloadComponent = () => {
    setKey(prevKey => prevKey + 1);  // Thay đổi key để trigger re-render
  };
  useEffect(() => {console.log('key', key);
  }, [key]);

  const handleLogout = async () => {
    try {
      const authenticator = AuthenticatorService.getInstance().getAuthenticator();

      // Kiểm tra nếu authenticator không phải là null hoặc undefined
      if (authenticator) {
        // Gọi phương thức logout và truyền redirectUri hợp lệ
        await authenticator.logout('http://103.221.220.183:8880');
        reloadComponent();
      } else {
        console.error('Authenticator không có sẵn');
      }
    } catch (error) {
      console.error('Lỗi khi logout:', error);
    }
  };
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
            <Section title="Step One">
              <Button title="Logout" onPress={handleLogout} />
              {'\n'}Edit <Text style={styles.highlight}>App.tsx</Text> to change this
              screen and then come back to see your edits.
            </Section>
            <Section title="See Your Changes">
              <ReloadInstructions />
            </Section>
            <Section title="Debug">
              <DebugInstructions />
            </Section>
            <Section title="Learn More">
              Read the docs to discover what to do next:
            </Section>
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
