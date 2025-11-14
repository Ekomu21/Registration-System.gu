import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const TranscriptsTab = () => {
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: transcript } = useQuery({
    queryKey: ["transcript", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const { data, error } = await supabase
        .from("student_transcript")
        .select("*")
        .eq("student_id", selectedStudentId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId,
  });

  const { data: gpa } = useQuery({
    queryKey: ["gpa", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const { data, error } = await supabase.rpc("calculate_student_gpa", {
        p_student_id: selectedStudentId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId,
  });

  const selectedStudent = students?.find((s) => s.student_id === selectedStudentId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Transcript</CardTitle>
          <CardDescription>View academic records and GPA for registered students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="student">Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger id="student">
                <SelectValue placeholder="Select a student" />
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

          {selectedStudent && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-medium">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cumulative GPA</p>
                  <p className="text-2xl font-bold text-primary">
                    {gpa !== null && gpa !== undefined ? Number(gpa).toFixed(2) : "N/A"}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <Card>
          <CardHeader>
            <CardTitle>Course History</CardTitle>
            <CardDescription>All enrolled and completed courses</CardDescription>
          </CardHeader>
          <CardContent>
            {transcript && transcript.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transcript.map((record: any, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{record.course_title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Level {record.course_level}</Badge>
                      </TableCell>
                      <TableCell>{record.semester}</TableCell>
                      <TableCell>{record.year}</TableCell>
                      <TableCell>{record.instructor_name || "TBA"}</TableCell>
                      <TableCell>
                        {record.grade ? (
                          <span className="font-semibold text-primary">{Number(record.grade).toFixed(2)}</span>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "COMPLETED"
                              ? "default"
                              : record.status === "ENROLLED"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">
                No course history found for this student. Register them in courses to see their transcript.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TranscriptsTab;
