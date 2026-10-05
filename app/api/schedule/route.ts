import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'Student ID Number';
  const id = searchParams.get('id') || '';

  // Mock schedule database records for NexusSIS
  const sampleSchedule = [
    {
      course_code: 'COMP301',
      title: 'Advanced Database Systems',
      section: 'A',
      room: 'Lab 302',
      time: '08:00 AM - 10:30 AM',
      days: 'Mon, Wed'
    },
    {
      course_code: 'NETW202',
      title: 'Enterprise Network Infrastructure',
      section: 'B',
      room: 'IT Center 104',
      time: '01:00 PM - 03:30 PM',
      days: 'Tue, Thu'
    },
    {
      course_code: 'SE305',
      title: 'Software Engineering Methodologies',
      section: 'A',
      room: 'Lecture Hall 2',
      time: '10:00 AM - 12:00 PM',
      days: 'Friday'
    }
  ];

  return NextResponse.json({ schedule: sampleSchedule });
}
