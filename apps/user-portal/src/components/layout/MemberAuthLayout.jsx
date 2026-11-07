import { LuDroplet, LuHandHeart, LuHospital, LuSiren } from "react-icons/lu";
import AuthLayout from "@lifelink/shared/components/layout/AuthLayout";

const MEMBER_POINTS = [
  { icon: LuSiren, text: "Send an emergency request with a short form" },
  { icon: LuDroplet, text: "Join the blood donor registry" },
  { icon: LuHandHeart, text: "Volunteer and join community events" },
  { icon: LuHospital, text: "Find hospitals and available ambulances" }
];

// Sign-in / registration layout with the user portal's brand panel
export default function MemberAuthLayout(props) {
  return <AuthLayout brandTitle="Help is closer when communities connect." points={MEMBER_POINTS} {...props} />;
}
