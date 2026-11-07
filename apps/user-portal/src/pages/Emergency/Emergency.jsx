import { useState } from "react";
import { LuCarFront, LuCircleHelp, LuFlame, LuSiren, LuStethoscope } from "react-icons/lu";
import FormPage from "../../components/layout/FormPage";
import EmergencyCallout from "../../components/emergency/EmergencyCallout";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import { useAuth } from "@lifelink/shared/hooks/useAuth";
import ChoiceGroup from "@lifelink/shared/components/form/ChoiceGroup";
import TextField from "@lifelink/shared/components/form/TextField";
import TextAreaField from "@lifelink/shared/components/form/TextAreaField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { emergencyApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { phone, required, validate } from "@lifelink/shared/utils/validation";

const EMERGENCY_TYPES = [
  { value: "Medical", label: "Medical", icon: <LuStethoscope /> },
  { value: "Accident", label: "Accident", icon: <LuCarFront /> },
  { value: "Fire", label: "Fire", icon: <LuFlame /> },
  { value: "Other", label: "Other", icon: <LuCircleHelp /> }
];

const INITIAL_VALUES = { emergencyType: "Medical", name: "", phone: "", location: "", description: "" };

const validateRequest = (values) =>
  validate(values, {
    emergencyType: [required("Choose the type of emergency.")],
    name: [required("Enter your name.")],
    phone: [required("Enter a phone number so responders can call you back."), phone()],
    location: [required("Enter where help is needed.")]
  });

const NEXT_STEPS = [
  { text: "Your request is saved and shown to LifeLink Pro coordinators." },
  { text: "Keep your phone nearby so they can call you back." },
  { text: "If the situation gets worse, call 112 straight away." }
];

export default function Emergency() {
  const { isAuthenticated } = useAuth();
  const [serverError, setServerError] = useState("");
  const [sent, setSent] = useState(null);
  const goBack = useGoBack("/");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateRequest,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { emergency } = await emergencyApi.create({
          name: values.name.trim(),
          emergencyType: values.emergencyType,
          location: values.location.trim(),
          phone: values.phone.trim(),
          description: values.description.trim()
        });
        setSent(emergency);
      } catch (error) {
        setServerError(getErrorMessage(error, "Your request could not be sent. Please try again, or call 112."));
      }
    }
  });

  const startOver = () => {
    form.reset();
    setSent(null);
  };

  return (
    <FormPage
      tone="danger"
      eyebrow="Emergency SOS"
      title="Request emergency help"
      description="Tell us what happened and where. Your request is shared with LifeLink Pro coordinators."
      asideLabel="Emergency numbers and next steps"
      aside={
        <>
          <EmergencyCallout title="Is someone's life in danger?" />
          <InfoPanel title="What happens next" numbered items={NEXT_STEPS} />
        </>
      }
    >
      {sent ? (
        <SuccessPanel
          title="Emergency request sent"
          message="LifeLink Pro coordinators can now see your request. Keep your phone nearby — if things get worse, call 112."
          details={[
            { label: "Reference", value: `#${sent.id}` },
            { label: "Type", value: sent.emergency_type },
            { label: "Location", value: sent.location },
            { label: "Phone", value: sent.phone }
          ]}
          actions={
            <>
              {isAuthenticated && <Button to="/requests">Track this request</Button>}
              <Button to="/" variant="secondary">Back to home</Button>
              <Button variant="ghost" onClick={startOver}>Send another request</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Your request was not sent">{serverError}</FormError>

          <FormSection title="What's happening?" columns={1}>
            <ChoiceGroup
              legend="Type of emergency"
              options={EMERGENCY_TYPES}
              columns={4}
              {...form.field("emergencyType")}
            />
          </FormSection>

          <FormSection title="Where to send help" description="Responders use these details to find and call you.">
            <TextField label="Your name" autoComplete="name" maxLength={150} {...form.field("name")} />
            <TextField
              label="Phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              {...form.field("phone")}
            />
            <TextField
              label="Location"
              full
              autoComplete="street-address"
              maxLength={255}
              hint="Street, landmark or area — be as specific as you can."
              {...form.field("location")}
            />
          </FormSection>

          <FormSection title="Anything else?" columns={1}>
            <TextAreaField
              label="What happened?"
              optional
              rows={3}
              maxLength={1000}
              hint="For example: number of people hurt, symptoms, or hazards nearby."
              {...form.field("description")}
            />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" variant="danger" size="lg" leftIcon={<LuSiren />} loading={form.submitting}>
              Send emergency request
            </Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
