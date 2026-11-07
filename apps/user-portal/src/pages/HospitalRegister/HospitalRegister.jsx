import { useState } from "react";
import FormPage from "../../components/layout/FormPage";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import ChoiceGroup from "@lifelink/shared/components/form/ChoiceGroup";
import TextField from "@lifelink/shared/components/form/TextField";
import TextAreaField from "@lifelink/shared/components/form/TextAreaField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { hospitalApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { hospitalEmergency } from "@lifelink/shared/utils/status";
import { phone, required, validate } from "@lifelink/shared/utils/validation";

// Stored as-is in hospitals.emergency_available
const EMERGENCY_OPTIONS = [
  { value: "Available", label: "Available", description: "Accepts emergency cases" },
  { value: "Not Available", label: "Not available", description: "No emergency department" }
];

const INITIAL_VALUES = { hospitalName: "", services: "", phone: "", address: "", emergencyAvailable: "" };

const validateHospital = (values) =>
  validate(values, {
    hospitalName: [required("Enter the hospital's name.")],
    phone: [required("Enter a contact number."), phone()],
    address: [required("Enter the hospital's address.")]
  });

const GUIDANCE = [
  { text: "Check the name and phone number carefully — they are shown publicly." },
  { text: "The hospital appears in the directory straight away." },
  { text: "To correct a listing later, ask a LifeLink Pro administrator." }
];

export default function HospitalRegister() {
  const [serverError, setServerError] = useState("");
  const [hospital, setHospital] = useState(null);
  const goBack = useGoBack("/hospitals");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateHospital,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { hospital: saved } = await hospitalApi.register({
          hospitalName: values.hospitalName.trim(),
          phone: values.phone.trim(),
          address: values.address.trim(),
          services: values.services.trim(),
          emergencyAvailable: values.emergencyAvailable
        });
        setHospital(saved);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't add the hospital. Please try again."));
      }
    }
  });

  const startOver = () => {
    form.reset();
    setHospital(null);
  };

  return (
    <FormPage
      backTo="/hospitals"
      backLabel="All hospitals"
      eyebrow="Hospitals"
      title="Register a hospital"
      description="Add a hospital to the LifeLink Pro directory so people can find its services and contact number."
      asideLabel="Before you add a hospital"
      aside={<InfoPanel title="Before you add a hospital" numbered items={GUIDANCE} />}
    >
      {hospital ? (
        <SuccessPanel
          title="Hospital added to the directory"
          message="It is now listed on the hospitals page."
          details={[
            { label: "Hospital", value: hospital.name },
            { label: "Phone", value: hospital.phone },
            { label: "Address", value: hospital.address },
            { label: "Emergency", value: hospitalEmergency(hospital.emergency_available)?.label }
          ]}
          actions={
            <>
              <Button to="/hospitals">View hospital directory</Button>
              <Button variant="secondary" onClick={startOver}>Add another hospital</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Hospital not added">{serverError}</FormError>

          <FormSection title="Hospital details" columns={1}>
            <TextField label="Hospital name" autoComplete="organization" maxLength={200} {...form.field("hospitalName")} />
            <TextAreaField
              label="Services offered"
              optional
              rows={3}
              maxLength={1000}
              hint="For example: emergency care, ICU, maternity, blood bank."
              {...form.field("services")}
            />
          </FormSection>

          <FormSection title="Contact and address">
            <TextField label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} {...form.field("phone")} />
            <TextField label="Address" autoComplete="street-address" maxLength={255} {...form.field("address")} />
          </FormSection>

          <FormSection title="Emergency services" columns={1}>
            <ChoiceGroup
              legend="Does the hospital accept emergency cases?"
              optional
              options={EMERGENCY_OPTIONS}
              columns={2}
              {...form.field("emergencyAvailable")}
            />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" size="lg" loading={form.submitting}>Add hospital</Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
