import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegistrationTab = () => {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select(`
          *,
          courses(title, level),
          instructors(name)
        `)
        .gt("available_seats", 0)
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          *,
          students(first_name, last_name),
          sections(
            semester,
            year,
            courses(title)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ student_id, section_id }: { student_id: string; section_id: string }) => {
      const { data, error } = await supabase.rpc("sp_register_student", {
        p_student_id: student_id,
        p_section_id: section_id,
      });
      if (error) throw error;
      return data as { success: boolean; message: string };
    },
    onSuccess: (data) => {
      if (data && data.success) {
        queryClient.invalidateQueries({ queryKey: ["enrollments"] });
        queryClient.invalidateQueries({ queryKey: ["sections"] });
        toast.success("Student registered successfully");
        setStudentId("");
        setSectionId("");
      } else if (data) {
        toast.error(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to register student");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !sectionId) {
      toast.error("Please select both student and section");
      return;
    }
    registerMutation.mutate({ student_id: studentId, section_id: sectionId });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Register Student</CardTitle>
          <CardDescription>Enroll a student in an available course section</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student">Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger id="student">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((student) => (
                      <SelectItem key={student.student_id} value={student.student_id}>
                        {student.first_name} {student.last_name} ({student.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select value={sectionId} onValueChange={setSectionId}>
                  <SelectTrigger id="section">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections?.map((section: any) => (
                      <SelectItem key={section.section_id} value={section.section_id}>
                        {section.courses?.title} - {section.semester} {section.year} ({section.available_seats} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {sections && sections.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Available Sections</AlertTitle>
                <AlertDescription>
                  All sections are currently full. Please create new sections with available capacity.
                </AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={registerMutation.isPending || !sections || sections.length === 0}>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Student
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Enrollments</CardTitle>
          <CardDescription>View the latest student registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments && enrollments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment: any) => (
                  <TableRow key={enrollment.enrollment_id}>
                    <TableCell className="font-medium">
                      {enrollment.students?.first_name} {enrollment.students?.last_name}
                    </TableCell>
                    <TableCell>{enrollment.sections?.courses?.title}</TableCell>
                    <TableCell>
                      {enrollment.sections?.semester} {enrollment.sections?.year}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          enrollment.status === "COMPLETED"
                            ? "default"
                            : enrollment.status === "ENROLLED"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{enrollment.grade ? enrollment.grade.toFixed(2) : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No enrollments found. Register your first student above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistrationTab;
