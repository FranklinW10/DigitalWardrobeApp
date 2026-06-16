import { Text, View, StyleSheet, TextInput, ActivityIndicator,} from "react-native";
import {Image} from "expo-image"; 
import { Link, useRouter } from "expo-router";
import {Host, VStack, Button, BottomSheet, ColorPicker} from "@expo/ui/swift-ui";
import {useState} from "react";

export default function ColorPickerIOS() {
  const [isPresented, setIsPresented]=useState(false);
  const [color, setColor] = useState("#FF6347")
  return (
    <View style={styles.container}>
      <Host>
        <Button onPress={()=>setIsPresented(true)}>
            <Text style={{ color:color}}></Text>
        </Button>
        <ColorPicker selection={color} onSelectionChange={setColor}/>
        <VStack>

            <BottomSheet isPresented={isPresented} onIsPresentedChange={setIsPresented}>
                <View style={{height:500}}>
                    <Text> Hello Everyone</Text>
                </View>
            </BottomSheet>
        </VStack>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  helloworldTitle: {
    color: "red"
  },
  image: {
    width: 200, 
    height: 200,
  },
});
