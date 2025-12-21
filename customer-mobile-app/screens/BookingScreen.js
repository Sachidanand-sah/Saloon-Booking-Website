import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/bookings`;

export default function BookingScreen({ route, navigation }) {
  const { service } = route.params;
  // Check for logged-in user (simulated)
  const [currentUser, setCurrentUser] = useState(route.params?.user || null);

  const handleBooking = () => {
    if (!currentUser) {
      Alert.alert(
        'Authentication Required',
        'Please log in to book an appointment.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log In', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    if (!date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceId: service.id,
        name: currentUser.name,
        email: currentUser.email,
        date: date,
      }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Booking failed');
        return response.json();
      })
      .then(data => {
        Alert.alert('Success', `Booking confirmed for ${service.name} on ${date}!`);
        navigation.navigate('Home');
      })
      .catch(error => {
        console.error('Error booking service:', error);
        Alert.alert('Error', 'Failed to connect to the server.');
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book {service.name}</Text>
      <Text style={styles.price}>Price: {service.price}</Text>

      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
      />

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="2024-01-01"
      />

      <Button title="Confirm Booking" onPress={handleBooking} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  price: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    fontSize: 16,
  },
});
