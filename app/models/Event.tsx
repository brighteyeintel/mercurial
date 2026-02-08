import mongoose, { model, models, type Model } from 'mongoose';

export interface EventRecord {
  _id: mongoose.Types.ObjectId;
  user_email: string;
  route_id: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new mongoose.Schema(
  {
    user_email: { type: String, required: true, index: true },
    route_id: { type: String, required: true, index: true },
    action: { type: String, required: true },
  },
  { timestamps: true }
);

export const EventModel: Model<EventRecord> =
  (models.Event as Model<EventRecord>) || model<EventRecord>('Event', EventSchema, 'events');
