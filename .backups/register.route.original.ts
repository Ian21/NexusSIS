import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      username,
      email,
      password,
      first_name,
      middle_name,
      last_name,
      preferred_name,
      student_id_num,
      dob,
      gender,
      nationality,
      ethnicity,
      permanent_address,
      term_address,
      phone_number,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      emergency_contact_address,
      college_faculty,
      degree_program,
      program_major,
      academic_advisor,
      enrollment_status,
      entry_term,
      previous_education,
    } = body

    if (!username || !email || !password || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Missing required registration fields.' },
        { status: 400 },
      )
    }

    const hashedPassword = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const userResult = await client.query(
        `
          INSERT INTO users (
            username,
            password_hash,
            official_email,
            first_name,
            last_name,
            role
          )
          VALUES ($1, $2, $3, $4, $5, 'Student')
          RETURNING id
        `,
        [username, hashedPassword, email, first_name, last_name],
      )

      const userId = userResult.rows[0].id

      const studentResult = await client.query(
        `
          INSERT INTO students (
            user_id,
            student_id_num,
            preferred_name,
            middle_name,
            dob,
            gender,
            nationality,
            ethnicity,
            permanent_address,
            term_address,
            phone_number,
            emergency_contact_name,
            emergency_contact_relationship,
            emergency_contact_phone,
            emergency_contact_address,
            college_faculty,
            degree_program,
            program_major,
            academic_advisor,
            enrollment_status,
            entry_term,
            previous_education,
            admission_status,
            financial_status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, 'ADMITTED', 'PENDING'
          )
          RETURNING *
        `,
        [
          userId,
          student_id_num,
          preferred_name || first_name,
          middle_name || null,
          dob || null,
          gender || null,
          nationality || null,
          ethnicity || null,
          permanent_address || null,
          term_address || null,
          phone_number || null,
          emergency_contact_name || null,
          emergency_contact_relationship || null,
          emergency_contact_phone || null,
          emergency_contact_address || null,
          college_faculty || null,
          degree_program || null,
          program_major || null,
          academic_advisor || null,
          enrollment_status || 'ACTIVE',
          entry_term || null,
          previous_education || null,
        ],
      )

      const student = studentResult.rows[0]

      await client.query(
        `
          INSERT INTO financial_ledgers (
            student_id,
            tuition_fee,
            lab_fees,
            dorm_fees,
            government_subsidy,
            paid_amount,
            balance_due,
            status
          )
          VALUES ($1, 5500.00, 300.00, 1200.00, 2000.00, 0.00, 5000.00, 'PENDING')
        `,
        [student.id],
      )

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        student,
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Registration API error:', error)

    return NextResponse.json(
      {
        error: error.message || 'Registration failed',
      },
      { status: 500 },
    )
  }
}
