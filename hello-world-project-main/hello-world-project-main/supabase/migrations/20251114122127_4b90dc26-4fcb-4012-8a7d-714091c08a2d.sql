-- Gulu University Course Registration System Database Schema

-- Students Table
CREATE TABLE IF NOT EXISTS public.students (
  student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('100', '200', '300', '400')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instructors Table
CREATE TABLE IF NOT EXISTS public.instructors (
  instructor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
  section_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
  semester TEXT NOT NULL CHECK (semester IN ('FALL', 'SPRING', 'SUMMER')),
  year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2100),
  instructor_id UUID REFERENCES public.instructors(instructor_id) ON DELETE SET NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  available_seats INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS public.enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.sections(section_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
  grade DECIMAL(3,2) CHECK (grade >= 0 AND grade <= 4.0),
  status TEXT DEFAULT 'ENROLLED' CHECK (status IN ('ENROLLED', 'COMPLETED', 'DROPPED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(section_id, student_id)
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for now (MVP - single admin user)
CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on instructors" ON public.instructors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sections" ON public.sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on enrollments" ON public.enrollments FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON public.instructors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to decrement available seats on enrollment
CREATE OR REPLACE FUNCTION public.decrement_section_seats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sections 
  SET available_seats = available_seats - 1
  WHERE section_id = NEW.section_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decrement_seats_on_enrollment 
  AFTER INSERT ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_section_seats();

-- Trigger to increment available seats on enrollment deletion
CREATE OR REPLACE FUNCTION public.increment_section_seats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sections 
  SET available_seats = available_seats + 1
  WHERE section_id = OLD.section_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_seats_on_deletion 
  AFTER DELETE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.increment_section_seats();

-- Stored Procedure: Register Student
CREATE OR REPLACE FUNCTION public.sp_register_student(
  p_student_id UUID,
  p_section_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_available_seats INTEGER;
  v_result JSON;
BEGIN
  -- Check if section has available seats
  SELECT available_seats INTO v_available_seats
  FROM public.sections
  WHERE section_id = p_section_id;

  IF v_available_seats IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Section not found');
  END IF;

  IF v_available_seats <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Section is full');
  END IF;

  -- Check if student is already enrolled
  IF EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE student_id = p_student_id AND section_id = p_section_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Student already enrolled in this section');
  END IF;

  -- Insert enrollment (trigger will decrement seats automatically)
  INSERT INTO public.enrollments (student_id, section_id, status)
  VALUES (p_student_id, p_section_id, 'ENROLLED');

  RETURN json_build_object('success', true, 'message', 'Student registered successfully');
END;
$$ LANGUAGE plpgsql;

-- View: Student Transcript
CREATE OR REPLACE VIEW public.student_transcript AS
SELECT 
  s.student_id,
  s.first_name || ' ' || s.last_name AS student_name,
  s.email AS student_email,
  c.course_id,
  c.title AS course_title,
  c.level AS course_level,
  sec.semester,
  sec.year,
  i.name AS instructor_name,
  e.grade,
  e.status,
  e.created_at AS enrollment_date
FROM public.students s
JOIN public.enrollments e ON s.student_id = e.student_id
JOIN public.sections sec ON e.section_id = sec.section_id
JOIN public.courses c ON sec.course_id = c.course_id
LEFT JOIN public.instructors i ON sec.instructor_id = i.instructor_id
ORDER BY sec.year DESC, sec.semester, c.title;

-- Function to calculate GPA for a student
CREATE OR REPLACE FUNCTION public.calculate_student_gpa(p_student_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  v_gpa DECIMAL(3,2);
BEGIN
  SELECT COALESCE(AVG(grade), 0.00)::DECIMAL(3,2) INTO v_gpa
  FROM public.enrollments
  WHERE student_id = p_student_id 
    AND grade IS NOT NULL
    AND status = 'COMPLETED';
  
  RETURN v_gpa;
END;
$$ LANGUAGE plpgsql;