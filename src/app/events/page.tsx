// src/app/events/page.tsx
'use client';
 
import UniversalEventForm from '../components/UniversalEventForm';

export default function EventsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <UniversalEventForm />
    </main>
  );
}
