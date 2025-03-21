import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the context and type
interface TokenContextType {
    token: string | null;
    setToken: (token: string | null) => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const useToken = () => {
    const context = useContext(TokenContext);
    if (!context) {
        throw new Error("useToken must be used within a TokenProvider");
    }
    return context;
};

export const TokenProvider = ({ children }: any) => {
    const [token, setTokenState] = useState<string | null>(null);

    useEffect(() => {
        // Load the token from AsyncStorage on app startup
        const loadToken = async () => {
            const savedToken = await AsyncStorage.getItem('token');
            if (savedToken) {
                setTokenState(savedToken);
            }
        };

        loadToken();
    }, []);

    const setToken = async (newToken: string | null) => {
        if (newToken) {
            await AsyncStorage.setItem('token', newToken);  // Save token to AsyncStorage
        } else {
            await AsyncStorage.removeItem('token'); // Remove token from AsyncStorage if null
        }
        setTokenState(newToken);  // Update state
    };

    return (
        <TokenContext.Provider value={{ token, setToken }}>
            {children}
        </TokenContext.Provider>
    );
};
