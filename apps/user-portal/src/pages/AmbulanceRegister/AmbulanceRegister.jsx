import { useState } from "react";
import FormPage from "../../components/layout/FormPage";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import ChoiceGroup from "@lifelink/shared/components/form/ChoiceGroup";
import TextField from "@lifelink/shared/components/form/TextField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { ambulanceApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { ambulanceStatus } from "@lifelink/shared/utils/status";
import { phone, required, validate } from "@lifelink/shared/utils/validation";

// Stored as-is in ambulances.status
const AVAILABILITY = [
  { value: "Available", label: "Available", description: "Ready to respond" },
  { value: "Busy", label: "Busy", description: "Currently on a call" }
];

const INITIAL_VALUES = { driverName: "", phone: "", vehicleNumber: "", location: "", availability: "Available" };

const validateAmbulance = (values) =>
  validate(values, {
    driverName: [required("Enter the driver's name.")],
    phone: [required("Enter the driver's phone number."), phone()],
    vehicleNumber: [required("Enter the vehicle number.")],
    location: [required("Enter where the ambulance is based.")],
    availability: [required("Choose the ambulance's availability.")]
  });

const GUIDANCE = [
  { text: "The driver's phone number is shown publicly so people can call directly." },
  { text: "Availability can't be changed after registering yet — choose the status that is true today." },
  { text: "The ambulance appears in the directory straight away." }
];

export default function AmbulanceRegister() {
  const [serverError, setServerError] = useState("");
  const [ambulance, setAmbulance] = useState(null);
  const goBack = useGoBack("/ambulance");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateAmbulance,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { ambulance: saved } = await ambulanceApi.register({
          driverName: values.driverName.trim(),
          phone: values.phone.trim(),
          vehicleNumber: values.vehicleNumber.trim().toUpperCase(),
          location: values.location.trim(),
          availability: values.availability
        });
        setAmbulance(saved);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't register the ambulance. Please try again."));
      }
    }
  });

  const startOver = () => {
    form.reset();
    setAmbulance(null);
  };

  return (
    <FormPage
      backTo="/ambulance"
      backLabel="All ambulances"
      eyebrow="Ambulances"
      title="Register an ambulance"
      description="List an ambulance so people nearby can see it and call the driver."
      asideLabel="Before you register"
      aside={<InfoPanel title="Before you register" numbered items={GUIDANCE} />}
    >
      {ambulance ? (
        <SuccessPanel
          title="Ambulance registered"
          message="It is now listed on the ambulances page."
          details={[
            { label: "Vehicle", value: ambulance.vehicle_number },
            { label: "Driver", value: ambulance.name },
            { label: "Base location", value: ambulance.location },
            { label: "Status", value: ambulanceStatus(ambulance.status).label }
          ]}
          actions={
            <>
              <Button to="/ambulance">View ambulances</Button>
              <Button variant="secondary" onClick={startOver}>Register another</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Ambulance not registered">{serverError}</FormError>

          <FormSection title="Driver">
            <TextField label="Driver name" autoComplete="name" maxLength={150} {...form.field("driverName")} />
            <TextField label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} {...form.field("phone")} />
          </FormSection>

          <FormSection title="Vehicle and location">
            <TextField
              label="Vehicle number"
              maxLength={30}
              autoCapitalize="characters"
              hint="As shown on the number plate."
              {...form.field("vehicleNumber")}
            />
            <TextField label="Base location" maxLength={255} hint="Area or station." {...form.field("location")} />
          </FormSection>

          <FormSection title="Availability" columns={1}>
            <ChoiceGroup legend="Current availability" options={AVAILABILITY} columns={2} {...form.field("availability")} />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" size="lg" loading={form.submitting}>Register ambulance</Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
