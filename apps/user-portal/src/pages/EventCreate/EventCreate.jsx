import { useState } from "react";
import { LuMapPin, LuSparkles, LuUsers } from "react-icons/lu";
import FormPage from "../../components/layout/FormPage";
import InfoPanel from "../../components/content/InfoPanel";
import SuccessPanel from "../../components/feedback/SuccessPanel";
import Button from "@lifelink/shared/components/ui/Button";
import TextField from "@lifelink/shared/components/form/TextField";
import TextAreaField from "@lifelink/shared/components/form/TextAreaField";
import { FormActions, FormError, FormSection } from "@lifelink/shared/components/form/FormLayout";
import { eventsApi } from "@lifelink/shared/services/lifelink";
import { useForm } from "@lifelink/shared/hooks/useForm";
import { useGoBack } from "@lifelink/shared/hooks/useGoBack";
import { getErrorMessage } from "@lifelink/shared/utils/errors";
import { formatEventDate, todayISO } from "@lifelink/shared/utils/format";
import { notInPast, required, validate } from "@lifelink/shared/utils/validation";

const INITIAL_VALUES = { eventName: "", description: "", date: "", location: "", organizer: "" };

const validateEvent = (values) =>
  validate(values, {
    eventName: [required("Enter a name for the event.")],
    date: [required("Choose the date of the event."), notInPast("Choose today or a future date.")],
    location: [required("Enter where the event takes place.")]
  });

const LISTING_TIPS = [
  { icon: LuSparkles, text: "Use a clear name, like “Blood donation camp — City Hall”." },
  { icon: LuMapPin, text: "Add a landmark so people can find the venue." },
  { icon: LuUsers, text: "Your event appears on the community events page straight away." }
];

export default function EventCreate() {
  const [serverError, setServerError] = useState("");
  const [created, setCreated] = useState(null);
  const goBack = useGoBack("/events");

  const form = useForm({
    initialValues: INITIAL_VALUES,
    validate: validateEvent,
    onSubmit: async (values) => {
      setServerError("");
      try {
        const { event } = await eventsApi.create({
          eventName: values.eventName.trim(),
          description: values.description.trim(),
          date: values.date,
          location: values.location.trim(),
          organizer: values.organizer.trim()
        });
        setCreated(event);
      } catch (error) {
        setServerError(getErrorMessage(error, "We couldn't create the event. Please try again."));
      }
    }
  });

  const startOver = () => {
    form.reset();
    setCreated(null);
  };

  return (
    <FormPage
      backTo="/events"
      backLabel="All events"
      eyebrow="Community events"
      title="Create an event"
      description="Share a drive, camp or awareness programme so others can find it and join."
      asideLabel="Tips for a good listing"
      aside={<InfoPanel title="Tips for a good listing" items={LISTING_TIPS} />}
    >
      {created ? (
        <SuccessPanel
          title="Your event is live"
          message="People can now find it on the community events page and let you know they're coming."
          details={[
            { label: "Event", value: created.title },
            { label: "Date", value: formatEventDate(created.date) },
            { label: "Location", value: created.location }
          ]}
          actions={
            <>
              <Button to="/events">View all events</Button>
              <Button variant="secondary" onClick={startOver}>Create another</Button>
            </>
          }
        />
      ) : (
        <form noValidate onSubmit={form.handleSubmit}>
          <FormError title="Event not created">{serverError}</FormError>

          <FormSection title="Event details" columns={1}>
            <TextField label="Event name" maxLength={200} {...form.field("eventName")} />
            <TextAreaField
              label="Description"
              optional
              maxLength={1000}
              hint="What will happen, and who it's for."
              {...form.field("description")}
            />
          </FormSection>

          <FormSection title="Date and place">
            <TextField label="Date" type="date" min={todayISO()} {...form.field("date")} />
            <TextField label="Location" maxLength={255} hint="Venue name or address." {...form.field("location")} />
          </FormSection>

          <FormSection title="Organiser" columns={1}>
            <TextField
              label="Organiser name"
              optional
              maxLength={150}
              hint="A person or group people will recognise."
              {...form.field("organizer")}
            />
          </FormSection>

          <FormActions>
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Button type="submit" size="lg" loading={form.submitting}>Create event</Button>
          </FormActions>
        </form>
      )}
    </FormPage>
  );
}
