import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const facultyId = searchParams.get('faculty_id');

    if (studentId) {
      const result = await pool.query(
        `SELECT c.code, c.title, c.credits, cs.section_number, cs.room_number, 
                cs.start_time, cs.end_time, cs.days_of_week, e.midterm_grade, e.final_grade, e.status
         FROM enrollments e
         JOIN course_sections cs ON e.section_id = cs.id
         JOIN courses c ON cs.course_id = c.id
         JOIN students s ON e.student_id = s.id
         WHERE s.student_id_num = $1 OR s.id::text = $1`,
        [studentId]
      );
      return NextResponse.json({ success: true, timetable: result.rows });
    } 
    
    if (facultyId) {
      const result = await pool.query(
        `SELECT cs.id as section_id, c.code, c.title, cs.section_number, 
                cs.room_number, cs.start_time, cs.end_time, cs.days_of_week,
                (SELECT COUNT(*) FROM enrollments e WHERE e.section_id = cs.id) as enrolled_count
         FROM course_sections cs
         JOIN courses c ON cs.course_id = c.id
         WHERE cs.faculty_user_id = $1`,
        [facultyId]
      );
      return NextResponse.json({ success: true, sections: result.rows });
    }

    return NextResponse.json({ error: 'Provide either student_id or faculty_id query parameter' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch timetable';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
