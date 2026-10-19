import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';

import { API_BASE_URL } from '../config';

const formatTime = (iso, timeZone) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone });
  } catch {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

export default function BookingScreen({ route, navigation }) {
  const { service, user, accessToken } = route.params;
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [timezone, setTimezone] = useState(undefined);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const findTimes = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Error', 'Please enter a date as YYYY-MM-DD');
      return;
    }
    setLoading(true);
    setSelected(null);
    fetch(`${API_BASE_URL}/availability?serviceId=${encodeURIComponent(service.id)}&date=${date}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setTimezone(data.timezone);
        setSlots(data.slots);
      })
      .catch(error => Alert.alert('Error', error.message || 'Failed to connect to the server.'))
      .finally(() => setLoading(false));
  };

  const handleBooking = () => {
    if (!accessToken) {
      Alert.alert('Authentication Required', 'Please log in to book an appointment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    if (!selected) {
      Alert.alert('Error', 'Please choose a time');
      return;
    }

    setLoading(true);
    fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ serviceId: service.id, startAt: selected }),
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        const { booking } = data;
        Alert.alert(
          'Booking confirmed',
          `${booking.service.name} with ${booking.staff.name} on ${date} at ${formatTime(booking.startAt, timezone)}.`,
        );
        navigation.navigate('Home', { user, accessToken });
      })
      .catch(error => {
        Alert.alert('Error', error.message || 'Failed to connect to the server.');
        findTimes();
      })
      .finally(() => setLoading(false));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Book {service.name}</Text>
      <Text style={styles.price}>
        ${service.price}
        {service.durationMins ? ` · ${service.durationMins} min` : ''}
      </Text>

      {user ? <Text style={styles.label}>Booking as {user.name}</Text> : null}

      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="2026-10-21"
        autoCapitalize="none"
        onSubmitEditing={findTimes}
      />
      <Button title="Find available times" onPress={findTimes} disabled={loading} />

      {loading ? <ActivityIndicator style={styles.spinner} size="large" color="#be185d" /> : null}

      {slots && !loading ? (
        slots.length === 0 ? (
          <Text style={styles.empty}>No times available on this day. Please try another date.</Text>
        ) : (
          <View style={styles.slots}>
            {slots.map(slot => (
              <TouchableOpacity
                key={slot.startAt}
                style={[styles.slot, selected === slot.startAt && styles.slotSelected]}
                onPress={() => setSelected(slot.startAt)}
              >
                <Text style={[styles.slotText, selected === slot.startAt && styles.slotTextSelected]}>
                  {formatTime(slot.startAt, timezone)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : null}

      {selected ? <Button title="Confirm Booking" onPress={handleBooking} disabled={loading} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
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
    marginBottom: 12,
    borderRadius: 5,
    fontSize: 16,
  },
  spinner: {
    marginTop: 20,
  },
  empty: {
    marginTop: 20,
    color: '#666',
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 20,
  },
  slot: {
    borderWidth: 1,
    borderColor: '#be185d',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  slotSelected: {
    backgroundColor: '#be185d',
  },
  slotText: {
    color: '#be185d',
    fontWeight: '600',
  },
  slotTextSelected: {
    color: '#fff',
  },
});
