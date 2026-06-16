import {useAuth} from "@/context/AuthContext";
import { router, useRouter } from 'expo-router';
import { createContext, ReactNode, useState,useContext, useEffect} from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet,Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail]= useState("");
    const [password, setPassword]= useState("");
    const [isLoading, setIsLoading] = useState(false);
    const {signIn} =useAuth();
    const handleSignIn = async() =>{
        if(!email || !password){
            Alert.alert("Error", "Please fill in all feilds")
        }
        setIsLoading(true)
        try{
            await signIn(email, password);
            router.push("/(tabs)")
        }catch(error){
            console.error(error);
            Alert.alert("Error","Incorrect email or password. Please try again.");
        }finally{
            setIsLoading(false)
        }
    };
    return (
        <SafeAreaView edges={["top","bottom"]} style ={styles.container}>
            <View style ={styles.content} >
                <Text style ={styles.title}>Welcome Back</Text>
                <Text style ={styles.subtitle}>Sign In to Continue</Text>
                <View style ={styles.form}>
                    <TextInput
                        placeholder="Email..."
                        placeholderTextColor={"#999"}
                        keyboardType='email-address'
                        autoComplete='email'
                        autoCapitalize='none'
                        value={email}
                        onChangeText={setEmail}
                        style ={styles.input}
                    />
                    <TextInput
                        placeholder="Password..."
                        placeholderTextColor={"#999"}
                        autoComplete='password'
                        value={password}
                        onChangeText={setPassword}
                        autoCapitalize='none'
                        secureTextEntry
                        style ={styles.input}
                    />
                    <TouchableOpacity style ={styles.button} onPress={handleSignIn}>
                        {isLoading? (
                          <ActivityIndicator size={24} color="#fff"/>
                        ): (
                        <Text style = {styles.buttontext}>
                            Sign In
                        </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style ={styles.linkbutton} onPress={()=>router.push("/(auth)/signup")}>
                        <Text style = {styles.linkbuttontext}>
                            Don't have an account? <Text style = {styles.linkbuttontextbold}> Sign-up</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  helloworldTitle: {
    color: "red"
  },
  image: {
    width: 200, 
    height: 200,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    color: "#666",
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor:"#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  button: {
    backgroundColor: "#000",
    borderRadius:12,
    padding: 16,
    alignItems: "center",
  },
  linkbutton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkbuttontext: {
    color: "#666",
    fontSize: 14,
  },
  linkbuttontextbold: {
    fontWeight: "600",
    color: "#000",
  },
  buttontext:{
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },




});

