import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { cssInterop } from "nativewind";
import { View } from "react-native";

cssInterop(Image, { className: "style" });

export function RecipeThumbnail({
  uri,
  className = "",
}: {
  uri: string | null;
  className?: string;
}) {
  if (uri) {
    return <Image source={{ uri }} className={className} contentFit="cover" transition={150} />;
  }
  return (
    <View className={`items-center justify-center bg-sage-100 ${className}`}>
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        tintColor="#8FAF7C"
        size={28}
      />
    </View>
  );
}
