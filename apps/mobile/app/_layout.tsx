import { Stack } from "expo-router"

const Rootlayout = () => {
  return (
    <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ headerShown: true }} />
    </Stack>
  )
}

export default Rootlayout