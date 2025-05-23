import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { authMiddleware } from './keycloakAuthenticate';

// Định nghĩa kiểu cho các props
interface KeycloakProviderProps {
  children: React.ReactNode;
}

export const KeycloakProvider: React.FC<KeycloakProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Giả sử authMiddleware là một hàm bất đồng bộ kiểm tra tình trạng xác thực
    authMiddleware().then((res) => {
      if (res.getToken()) {
        console.log(res);

        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

    });
  }, []);
  console.log(isAuthenticated);

  if (!isAuthenticated) {
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <>{children}</>;
};
