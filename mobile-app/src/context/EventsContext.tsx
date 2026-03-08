import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getEvents as apiGetEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
} from '../lib/api';

export interface SubEvent {
  name: string;
  distance?: number;
  distanceLabel?: string;
  goalTime?: number;
  notes?: string;
}

export interface Event {
  id: number;
  userId: number;
  name: string;
  eventType: string;
  date: string;
  location?: string;
  distance?: number;
  distanceLabel?: string;
  goalTime?: number;
  notes?: string;
  priority: string;
  subEvents?: SubEvent[];
  createdAt: string;
  updatedAt: string;
}

interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

interface EventsContextType extends EventsState {
  loadEvents: () => Promise<void>;
  createEvent: (data: Partial<Event>) => Promise<Event>;
  updateEvent: (id: number, data: Partial<Event>) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EventsState>({
    events: [],
    isLoading: false,
    error: null,
  });

  const loadEvents = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const events = await apiGetEvents();
      const fetched = events as Event[];
      setState(prev => ({
        ...prev,
        events: fetched,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
    }
  }, []);

  const createEvent = useCallback(async (data: Partial<Event>): Promise<Event> => {
    const event = await apiCreateEvent(data) as Event;
    setState(prev => ({ ...prev, events: [event, ...prev.events] }));
    return event;
  }, []);

  const updateEvent = useCallback(async (id: number, data: Partial<Event>) => {
    const updated = await apiUpdateEvent(id, data) as Event;
    setState(prev => ({
      ...prev,
      events: prev.events.map(e => e.id === id ? updated : e),
    }));
  }, []);

  const deleteEvent = useCallback(async (id: number) => {
    await apiDeleteEvent(id);
    setState(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== id),
    }));
  }, []);

  return (
    <EventsContext.Provider value={{ ...state, loadEvents, createEvent, updateEvent, deleteEvent }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};
