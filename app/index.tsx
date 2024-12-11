import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  Platform,
  Linking,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { FontAwesome } from "@expo/vector-icons";
import chargerData from "../data/chargers.json";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";

const chargerIcon = require("../assets/image.png");

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type Charger = {
  name: string;
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  connector_types: string[];
  distance?: number;
};

export default function Index() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [selectedChargers, setSelectedChargers] = useState<Charger[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredChargers, setFilteredChargers] = useState<Charger[]>([]);
  const [region, setRegion] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  });

  const discovery = {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
  };

  const redirectUri = "com.xkshxt.evchargerapp://oauth2redirect";
const [request, response, promptAsync] = useAuthRequest(
  {
    clientId: "<1073355822548-a5j2ff498mo9vi3u4rlo3gnc19cgmm72.apps.googleusercontent.com>",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    redirectUri: redirectUri,
  },
  discovery
);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.error("Permission to access location was denied");
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const userLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setLocation(userLocation);
      setRegion((prev) => ({
        ...prev,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }));

      const updatedChargers = chargerData.chargers.map((charger) => {
        const distance = haversine(userLocation, {
          latitude: charger.latitude,
          longitude: charger.longitude,
        });
        return { ...charger, distance };
      });

      setChargers(updatedChargers);
      setFilteredChargers(updatedChargers);
    })();
  }, []);

  // Focus on the first matched charger and update the filtered list
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChargers(chargers);
    } else {
      const filtered = chargers.filter((charger) =>
        charger.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChargers(filtered);

      // Focus on the first matching charger
      if (filtered.length > 0) {
        const targetCharger = filtered[0];
        setRegion({
          latitude: targetCharger.latitude,
          longitude: targetCharger.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    }
    setSelectedChargers([]);
  }, [searchQuery, chargers]);

  const toggleChargerSelection = (charger: Charger) => {
    if (selectedChargers.find((c) => c.id === charger.id)) {
      setSelectedChargers(selectedChargers.filter((c) => c.id !== charger.id));
    } else {
      const updatedSelected = [...selectedChargers, charger];
      if (updatedSelected.length > 2) {
        updatedSelected.shift(); // Remove the first item if more than 2 are selected
      }
      setSelectedChargers(updatedSelected);
    }
  };

  const openNavigation = (latitude: number, longitude: number) => {
    const url =
  Platform.OS === "android"
    ? `google.navigation:q=${latitude},${longitude}`
    : `http://maps.apple.com/?daddr=${latitude},${longitude}`;

    console.log("Redirecting to URL:", url); // Log the URL to the console

    Linking.openURL(url).catch((err) =>
      console.error("Failed to open navigation", err)
    );
  };

  // Focus map on the user's current location
  const focusOnUserLocation = () => {
    if (location) {
      setRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    Keyboard.dismiss(); // Dismiss the keyboard when the clear button is pressed
  };

  const mapRef = React.useRef<MapView>(null);

  useEffect(() => {
    if (response?.type === "success") {
      const { access_token } = response.params;
      console.log("Access Token:", access_token);
      // Store the access token in state if needed
    }
  }, [response]);

  const handleScreenshot = async () => {
    try {
      const uri = await captureRef(mapRef, {
        format: "png",
        quality: 1,
      });

      console.log("Screenshot captured in PNG format:", uri); // Log PNG format

      const manipulatedImage = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 1,
        format: ImageManipulator.SaveFormat.WEBP,
      });

      console.log("Screenshot converted to WEBP format:", manipulatedImage.uri); // Log WEBP format

      // Trigger the OAuth flow
      const authResult = await promptAsync();
      if (authResult.type === "success") {
        uploadToGoogleDrive(manipulatedImage.uri, authResult.params.access_token);
      } else {
        console.error("Authentication failed or was cancelled");
      }
    } catch (error) {
      console.error("Screenshot capture failed:", error);
    }
  };

  const uploadToGoogleDrive = async (fileUri: string, accessToken: string) => {
    try {
      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=media",
        {
          method: "POST",
          headers: {
            Authorization: 'Bearer ${accessToken}',
            "Content-Type": "image/webp",
          },
          body: fileBase64,
        }
      );

      const result = await uploadResponse.json();
      console.log("File uploaded successfully:", result);
    } catch (error) {
      console.error("Google Drive upload failed:", error);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.burgerMenu}>
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search for the compatible chargers"
            placeholderTextColor="white"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onBlur={Keyboard.dismiss}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={clearSearch}
            >
              <FontAwesome name="times" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          region={region}
          onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
          onPress={Keyboard.dismiss}
          onPanDrag={Keyboard.dismiss}
        >
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            pinColor="pink"
            title="You are here"
          />
          {filteredChargers.map((charger) => {
            const varietyCount = new Set(charger.connector_types).size;
            return (
              <Marker
                key={charger.id}
                coordinate={{
                  latitude: charger.latitude,
                  longitude: charger.longitude,
                }}
                onPress={() => toggleChargerSelection(charger)}
              >
                <View style={styles.markerContainer}>
                  <View
                    style={[
                      styles.marker,
                      selectedChargers.find((c) => c.id === charger.id)
                        ? styles.selectedMarker
                        : styles.defaultMarker,
                    ]}
                  >
                    <Text style={styles.markerText}>{varietyCount}</Text>
                  </View>
                </View>
              </Marker>
            );
          })}
        </MapView>
      ) : null}

      {selectedChargers.length > 0 && (
        <View style={styles.bottomContainer}>
          <ScrollView horizontal>
            {selectedChargers.map((charger) => {
              const distance = haversine(location || { latitude: 0, longitude: 0 }, {
                latitude: charger.latitude,
                longitude: charger.longitude,
              });
              return (
                <View key={charger.id} style={styles.popup}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => toggleChargerSelection(charger)}
                  >
                    <Text style={styles.closeButtonText}>X</Text>
                  </TouchableOpacity>
                  <Text style={styles.popupTitle}>{charger.name}</Text>
                  <View style={styles.addressContainer}>
                    <Text style={styles.popupText}>{charger.address.toLowerCase()}</Text>
                    <Text style={styles.distanceText}>
                      {distance && (distance / 1000).toFixed(2)} km
                    </Text>
                  </View>
                  <Text style={styles.popupHeading}>Supported Connectors:</Text>
                  {charger.connector_types.map((type, index) => {
                    const [connector, quantity] = type.split("-");
                    return (
                      <View key={index} style={styles.connectorRow}>
                        <Image source={chargerIcon} style={styles.connectorIcon} />
                        <Text style={styles.connectorItem}>
                          {connector} ({quantity} unit)
                        </Text>
                      </View>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.navigationButton}
                    onPress={() =>
                      openNavigation(charger.latitude, charger.longitude)
                    }
                  >
                    <FontAwesome name="location-arrow" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Back to My Location Button */}
      <TouchableOpacity
        style={styles.backToLocationButton}
        onPress={focusOnUserLocation}>
        <FontAwesome name="location-arrow" size={20} color="white" />
      </TouchableOpacity>

      {/* FAB Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={handleScreenshot}>
        <FontAwesome name="camera" size={20} color="white" />
      </TouchableOpacity>

    </View>
  );
}
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      position: "absolute",
      top: 10,
      left: 10,
      right: 55,
      zIndex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    burgerMenu: {
      width: 30,
      height: 30,
      justifyContent: "space-around",
      alignItems: "center",
      marginRight: 10,
    },
    burgerLine: {
      width: 20,
      height: 3,
      backgroundColor: "black",
      borderRadius: 3,
    },
    searchBar: {
      flex: 1,
      backgroundColor: "black",
      borderRadius: 10,
      padding: 10,
      elevation: 5,
      color: "white",
    },
    map: {
      flex: 1,
    },
    markerContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    marker: {
      width: 25,
      height: 25,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    defaultMarker: {
      backgroundColor: "green",
    },
    selectedMarker: {
      backgroundColor: "grey",
    },
    markerText: {
      color: "white",
      fontWeight: "bold",
    },
    bottomContainer: {
      position: "absolute",
      bottom: 10,
      left: 10,
      right: 10,
    },
    popup: {
      width: 190,
      height: 190,
      marginHorizontal: 5,
      padding: 15,
      backgroundColor: "black",
      borderRadius: 10,
      elevation: 5,
    },
    closeButton: {
      position: "absolute",
      top: 8,
      right: 10,
    },
    closeButtonText: {
      fontSize: 25,
      color: "red",
    },
    popupTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "green", // Green color for charger name
    },
    addressContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 5,
    },
    popupText: {
      color: "white",
      fontSize: 12,
    },
    distanceText: {
      color: "red",
      fontSize: 12,
    },
    popupHeading: {
      fontSize: 14,
      fontWeight: "bold",
      color: "green", 
    },
    connectorItem: {
      color: "white",
      fontSize: 12,
      paddingLeft: 15, 
    },
    navigationButton: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      width: 25, 
      height: 25, 
      borderRadius: 15, 
      backgroundColor: 'green',
      justifyContent: 'center',
      alignItems: 'center',
    },
    navigationText: {
      fontSize: 1,
      marginLeft: 5,
      color: "white",
      fontWeight: "bold",
    },

    backToLocationButton: {
      position: "absolute",
      top: 55,
      left: 10,
      width: 35,
      height: 35,
      backgroundColor: "blue",
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    connectorRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 5,
    },
    connectorIcon: {
      width: 30,
      height: 35,
      marginRight: 10,
    },
    fab: {
      position: "absolute",
      bottom: 190,
      right: 20,
      backgroundColor: "blue",
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
    }
  });
