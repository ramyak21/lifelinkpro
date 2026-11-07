import { useState } from "react";
import { LuMapPin, LuPackage, LuPhone } from "react-icons/lu";
import FormPage from "../../components/layout/FormPage";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import TextField from "@lifelink/shared/components/form/TextField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { foodApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { phone, required, validate } from "@lifelink/shared/utils/validation";

const INITIAL_VALUES = { foodType: "", quantity: "", location: "", donorName: "", phone: "" };

const validateDonation = (values) =>
  validate(values, {
    foodType: [required("Describe the food you're donating.")],
    quantity: [required("Enter how much food there is.")],
    location: [required("Enter where the food can be collected.")],
    donorName: [required("Enter your name.")],
    phone: [required("Enter a phone number so a coordinator can arrange pickup."), phone()]
  });

const PICKUP_TIPS = [
  { icon: LuPackage, text: "Pack food in clean, covered containers." },
  { icon: LuMapPin, text: "Give an exact address or a nearby landmark." },
  { icon: LuPhone, text: "Keep your phone nearby so a coordinator can confirm the pickup." }
];

const NEXT_STEPS = [
  { text: "Your donation is listed for LifeLink Pro coordinators." },
  { text: "A coordinator can call you to arrange collection." }
];

export default function FoodDonation() {
  const { isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState("");
  const [donation, setDonation] = useState(null);
  const goBack = useGoBack("/");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateDonation,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { donation: saved } = await foodApi.donate({
          donorName: values.donorName.trim(),
          phone: values.phone.trim(),
          foodType: values.foodType.trim(),
          quantity: values.quantity.trim(),
          location: values.location.trim()
        });
        setDonation(saved);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't record your donation. Please try again."));
      }
    }
  });

  const startOver = () => {
    form.reset();
    setDonation(null);
  };

  return (
    <FormPage
      eyebrow="Get involved"
      title="Donate food"
      description="Tell us what you have and where to collect it, so surplus food reaches people who need it."
      asideLabel="Pickup tips"
      aside={
        <>
          <InfoPanel title="Tips for a smooth pickup" items={PICKUP_TIPS} />
          <InfoPanel title="What happens next" numbered items={NEXT_STEPS} />
        </>
      }
    >
      {donation ? (
        <SuccessPanel
          title="Thank you for donating food"
          message="Your donation has been recorded. Keep your phone nearby so a coordinator can arrange the pickup."
          details={[
            { label: "Food", value: donation.food_type },
            { label: "Quantity", value: donation.quantity },
            { label: "Pickup location", value: donation.location }
          ]}
          actions={
            <>
              {isAuthenticated && <Button to="/requests">View in My requests</Button>}
              <Button to="/" variant="secondary">Back to home</Button>
              <Button variant="ghost" onClick={startOver}>Donate more food</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Donation not recorded">{serverError}</FormError>

          <FormSection title="What are you donating?">
            <TextField
              label="Type of food"
              maxLength={100}
              hint="For example: cooked meals, rice, fruit."
              {...form.field("foodType")}
            />
            <TextField
              label="Quantity"
              maxLength={100}
              hint="For example: 20 meal packs or 5 kg."
              {...form.field("quantity")}
            />
          </FormSection>

          <FormSection title="Pickup location" columns={1}>
            <TextField
              label="Address or landmark"
              autoComplete="street-address"
              maxLength={255}
              {...form.field("location")}
            />
          </FormSection>

          <FormSection title="Your contact details">
            <TextField label="Your name" autoComplete="name" maxLength={150} {...form.field("donorName")} />
            <TextField label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} {...form.field("phone")} />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" size="lg" loading={form.submitting}>Submit donation</Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
