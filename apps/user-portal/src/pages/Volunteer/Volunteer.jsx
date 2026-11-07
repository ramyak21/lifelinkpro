import { useState } from "react";
import FormPage from "../../components/layout/FormPage";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import ChoiceGroup from "@lifelink/shared/components/form/ChoiceGroup";
import TextField from "@lifelink/shared/components/form/TextField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { volunteerApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { firstName } from "@lifelink/shared/utils/format";
import { email, phone, required, validate } from "@lifelink/shared/utils/validation";

// Stored as-is in volunteers.availability
const AVAILABILITY = [
  { value: "Full Time", label: "Full time", description: "Available most days" },
  { value: "Part Time", label: "Part time", description: "A few hours a week" },
  { value: "Weekends", label: "Weekends", description: "Saturdays and Sundays" }
];

const INITIAL_VALUES = { name: "", phone: "", email: "", skills: "", location: "", availability: "" };

const validateVolunteer = (values) =>
  validate(values, {
    name: [required("Enter your full name.")],
    phone: [required("Enter a phone number so coordinators can reach you."), phone()],
    email: [email()],
    location: [required("Enter where you'd like to volunteer.")],
    availability: [required("Choose when you're available.")]
  });

const HOW_IT_WORKS = [
  { text: "Tell us your skills and when you're free." },
  { text: "Coordinators can see your details and contact you about suitable activities." },
  { text: "Join community events to meet other volunteers." }
];

export default function Volunteer() {
  const { isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState("");
  const [volunteer, setVolunteer] = useState(null);
  const goBack = useGoBack("/");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateVolunteer,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { volunteer: saved } = await volunteerApi.register({
          name: values.name.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          skills: values.skills.trim(),
          location: values.location.trim(),
          availability: values.availability
        });
        setVolunteer(saved);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't complete your registration. Please try again."));
      }
    }
  });

  return (
    <FormPage
      eyebrow="Get involved"
      title="Volunteer with LifeLink Pro"
      documentTitle="Volunteer"
      description="Tell us how you'd like to help, so coordinators can reach you when there's a need that fits your skills."
      asideLabel="How volunteering works"
      aside={<InfoPanel title="How volunteering works" numbered items={HOW_IT_WORKS} />}
    >
      {volunteer ? (
        <SuccessPanel
          title={`Thanks for volunteering, ${firstName(volunteer.name)}!`}
          message="Coordinators can now see your details and reach you about activities that match your skills."
          details={[
            { label: "Availability", value: volunteer.availability },
            { label: "Location", value: volunteer.location },
            { label: "Skills", value: volunteer.skills }
          ]}
          actions={
            <>
              {isAuthenticated && <Button to="/requests">View in My requests</Button>}
              <Button to="/events">Browse community events</Button>
              <Button to="/" variant="secondary">Back to home</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Registration not completed">{serverError}</FormError>

          <FormSection title="Personal information" columns={1}>
            <TextField label="Full name" autoComplete="name" maxLength={150} {...form.field("name")} />
          </FormSection>

          <FormSection title="Contact">
            <TextField label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} {...form.field("phone")} />
            <TextField
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              optional
              maxLength={255}
              {...form.field("email")}
            />
          </FormSection>

          <FormSection title="Skills and location">
            <TextField
              label="Skills"
              optional
              maxLength={255}
              hint="For example: first aid, teaching, driving."
              {...form.field("skills")}
            />
            <TextField
              label="Where you'd like to help"
              autoComplete="address-level2"
              maxLength={255}
              hint="City or area."
              {...form.field("location")}
            />
          </FormSection>

          <FormSection title="Availability" columns={1}>
            <ChoiceGroup legend="When are you available?" options={AVAILABILITY} columns={3} {...form.field("availability")} />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" size="lg" loading={form.submitting}>Register as a volunteer</Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
