// The services LifeLink Pro offers, grouped the way people look for them.
// Navigation, the home page, the dashboard and the footer all read from here.
import {
  LuAmbulance,
  LuCalendarDays,
  LuDroplet,
  LuHandHeart,
  LuHospital,
  LuSiren,
  LuUtensils
} from "react-icons/lu";

export const SERVICES = {
  emergency: {
    id: "emergency",
    title: "Emergency SOS",
    description: "Send an urgent request with your location and phone number.",
    to: "/emergency",
    icon: LuSiren,
    urgent: true
  },
  hospitals: {
    id: "hospitals",
    title: "Hospitals",
    description: "Find hospitals, their services and emergency availability.",
    to: "/hospitals",
    icon: LuHospital
  },
  ambulances: {
    id: "ambulances",
    title: "Ambulances",
    description: "See registered ambulances and which are available now.",
    to: "/ambulance",
    icon: LuAmbulance
  },
  blood: {
    id: "blood",
    title: "Blood donation",
    description: "Join the donor registry so coordinators can reach you.",
    to: "/blood",
    icon: LuDroplet
  },
  food: {
    id: "food",
    title: "Food donation",
    description: "Offer surplus food for pickup and distribution.",
    to: "/food",
    icon: LuUtensils
  },
  volunteer: {
    id: "volunteer",
    title: "Volunteer",
    description: "Share your time and skills with community programmes.",
    to: "/volunteer",
    icon: LuHandHeart
  },
  events: {
    id: "events",
    title: "Community events",
    description: "Find and join local drives, camps and awareness events.",
    to: "/events",
    icon: LuCalendarDays
  }
};

export const SERVICE_GROUPS = [
  {
    id: "get-help",
    title: "Get help",
    description: "Urgent support and medical services near you.",
    services: [SERVICES.emergency, SERVICES.hospitals, SERVICES.ambulances]
  },
  {
    id: "get-involved",
    title: "Get involved",
    description: "Ways to support people in your community.",
    services: [SERVICES.blood, SERVICES.food, SERVICES.volunteer]
  }
];

// National emergency numbers (India), shown wherever urgent help is offered
export const EMERGENCY_NUMBERS = [
  { number: "112", label: "Emergency services" },
  { number: "108", label: "Ambulance" }
];
