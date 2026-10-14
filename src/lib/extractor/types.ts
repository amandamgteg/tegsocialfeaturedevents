export type EventItem = {
  id: string;
  title: string;
  eventUrl: string;
  eventUrlType: "external" | "internal";
  embeddedImageUrl?: string;
  sourceUrl: string;
  mishaHosted: false;
};

export type ExtractionResult = {
  eventId: string;
  status: "resolved" | "failed";
  imageUrl?: string;
  instagramHandle?: string;
  failureReason?: string;
};
