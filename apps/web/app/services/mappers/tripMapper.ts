import type { CreateTripInput, TripFormValues } from "~/types/interfaces/trips";

export function toCreateTripInput(values: TripFormValues): CreateTripInput {
  return {
    title: values.title,
    startDate: values.startDate,
    endDate: values.endDate || null,
    countryIds: values.countryIds,
    cityIds: values.cityIds,
    rating: values.rating,
    review: values.review || null,
  };
}
