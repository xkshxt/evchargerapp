EV Charger Mobile App

This project is an EV Charger Infrastructure mobile app that allows users to view a map with EV charger locations, search for specific chargers, and capture screenshots of the map to upload to their Google Drive.

Current Features

1. Map View
- Displays a map using `react-native-maps` with dynamic markers for EV chargers.
- Fetches and displays the user's current location.

2. Search Functionality
- Includes a search bar for finding specific EV chargers by name or details.
- Implements functionality for clearing the search query and dismissing the keyboard.

3. Screenshot Capture
- Users can take a screenshot of the map view by pressing the floating action button (FAB).
- The screenshot will be converted to `.webp` format using `expo-image-manipulator`.

4. Google Drive Upload
- Authenticates users with their Google account using `expo-auth-session` and `expo-google-auth-session`.
- After authentication, uploads the screenshot directly to the user’s Google Drive.

Dependencies

The following libraries and modules are being used to implement the current functionality:

1. `react-native-maps`  
   - For rendering the map and displaying markers.

2. `react-native-view-shot`  
   - To capture a screenshot of the map view.

3. `expo-image-manipulator`  
   - For converting the captured screenshot to `.webp` format.

4. `expo-auth-session`  
   - For implementing OAuth2-based Google authentication.

5. `expo-google-auth-session`  
   - To handle Google-specific authentication flows.

Development Environment

- Framework: React Native (using Expo Dev Client for hot reloading).  
- Development Build: Expo Dev Build has been initialized to enable hot reloading and use native modules.

Next Steps

1. Implement the functionality to convert the captured screenshot into `.webp` format using `expo-image-manipulator`.
2. Integrate Google Drive API for uploading the converted screenshot to the user’s Google Drive.
3. Test end-to-end functionality, including map interaction, screenshot capture, and Google Drive upload.
4. Create a release build (APK) for Android devices.
