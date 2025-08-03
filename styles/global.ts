import { StyleSheet } from 'react-native';

// Global styles that can be used across all components
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerIcon: {
    marginRight: 8,
  },
  headerIconStyle: {
    color: "#8427d9",
  },
  headerTitle: {
    fontFamily: 'OpenSans',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  boxCard: {
    backgroundColor: 'rgba(132, 39, 217, 1)',
    borderWidth: 1,
    borderColor: 'rgba(172, 95, 243, 1)',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  text: {
    fontSize: 14,
  },
  textMuted: {
    fontSize: 14,
  },
  button: {
    backgroundColor: 'rgba(132, 39, 217, 1)',
    borderRadius: 8,
  }
});