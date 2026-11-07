import { useState } from "react";
import { LuMapPin, LuPhone, LuUserRound } from "react-icons/lu";
import FormPage from "../../components/layout/FormPage";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import ChoiceGroup from "@lifelink/shared/components/form/ChoiceGroup";
import TextField from "@lifelink/shared/components/form/TextField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { bloodApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { firstName } from "@lifelink/shared/utils/format";
import { phone, required, validate, wholeNumberBetween } from "@lifelink/shared/utils/validation";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => ({
  value: group,
  label: group
}));

const INITIAL_VALUES = { bloodGroup: "", name: "", age: "", phone: "", location: "" };

const validateDonor = (values) =>
  validate(values, {
    bloodGroup: [required("Choose your blood group.")],
    name: [required("Enter your full name.")],
    age: [required("Enter your age."), wholeNumberBetween(18, 65, "Donors must be between 18 and 65 years old.")],
    phone: [required("Enter a phone number so coordinators can reach you."), phone()],
    location: [required("Enter the city or area where you can donate.")]
  });

const BEFORE_YOU_REGISTER = [
  { icon: LuUserRound, text: "Donors must be between 18 and 65 years old." },
  { icon: LuPhone, text: "Each phone number can be registered once." },
  { icon: LuMapPin, text: "Give the city or area where you're able to donate." }
];

const NEXT_STEPS = [
  { text: "Your details are added to the LifeLink Pro donor registry." },
  { text: "A coordinator may call you when someone needs your blood group." },
  { text: "To leave the registry, ask a LifeLink Pro administrator." }
];

export default function BloodDonation() {
  const { isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState("");
  const [donor, setDonor] = useState(null);
  const goBack = useGoBack("/");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateDonor,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { donor: saved } = await bloodApi.register({
          name: values.name.trim(),
          phone: values.phone.trim(),
          age: values.age.trim(),
          bloodGroup: values.bloodGroup,
          location: values.location.trim()
        });
        setDonor(saved);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't register you as a donor. Please try again."));
      }
    }
  });

  return (
    <FormPage
      eyebrow="Get involved"
      title="Become a blood donor"
      description="Join the LifeLink Pro donor registry so coordinators can contact you when someone needs your blood group."
      asideLabel="Donor information"
      aside={
        <>
          <InfoPanel title="Before you register" items={BEFORE_YOU_REGISTER} />
          <InfoPanel title="What happens next" numbered items={NEXT_STEPS} />
        </>
      }
    >
      {donor ? (
        <SuccessPanel
          title="You're registered as a blood donor"
          message={`Thank you, ${firstName(donor.name)}. Coordinators can now reach you when someone needs ${donor.blood_group} blood.`}
          details={[
            { label: "Blood group", value: donor.blood_group },
            { label: "Location", value: donor.location },
            { label: "Phone", value: donor.phone }
          ]}
          actions={
            <>
              {isAuthenticated && <Button to="/requests">View in My requests</Button>}
              <Button to="/" variant="secondary">Back to home</Button>
              <Button to="/volunteer" variant="ghost">Volunteer with us too</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Registration not completed">{serverError}</FormError>

          <FormSection title="Your blood group" columns={1}>
            <ChoiceGroup
              legend="Blood group"
              hint="You can find it on a blood test report or a previous donor card."
              options={BLOOD_GROUPS}
              columns={4}
              compact
              {...form.field("bloodGroup")}
            />
          </FormSection>

          <FormSection title="About you">
            <TextField label="Full name" autoComplete="name" maxLength={150} {...form.field("name")} />
            <TextField
              label="Age"
              type="number"
              inputMode="numeric"
              min={18}
              max={65}
              hint="18 to 65 years."
              {...form.field("age")}
            />
          </FormSection>

          <FormSection title="Contact details">
            <TextField label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} {...form.field("phone")} />
            <TextField
              label="City or area"
              autoComplete="address-level2"
              maxLength={255}
              {...form.field("location")}
            />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" size="lg" loading={form.submitting}>Register as a donor</Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
