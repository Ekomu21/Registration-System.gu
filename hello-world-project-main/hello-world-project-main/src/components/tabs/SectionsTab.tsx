import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const SectionsTab = () => {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [semester, setSemester] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [instructorId, setInstructorId] = useState("");
  const [capacity, setCapacity] = useState("");

  const { data: sections, isLoading } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select(`
          *,
          courses(title, level),
          instructors(name)
        `)
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const { data: instructors } = useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("instructors").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newSection: any) => {
      const { data, error } = await supabase.from("sections").insert([newSection]).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Section added successfully");
      setCourseId("");
      setSemester("");
      setInstructorId("");
      setCapacity("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add section");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("section_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      toast.success("Section deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete section");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !semester || !year || !capacity) {
      toast.error("Please fill in all required fields");
      return;
    }
    const capacityNum = parseInt(capacity);
    addMutation.mutate({
      course_id: courseId,
      semester,
      year: parseInt(year),
      instructor_id: instructorId || null,
      capacity: capacityNum,
      available_seats: capacityNum,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Section</CardTitle>
          <CardDescription>Create a new course section for the semester</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.course_id} value={course.course_id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger id="semester">
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FALL">Fall</SelectItem>
                    <SelectItem value="SPRING">Spring</SelectItem>
                    <SelectItem value="SUMMER">Summer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="2024"
                  max="2100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructor">Instructor (Optional)</Label>
                <Select value={instructorId} onValueChange={setInstructorId}>
                  <SelectTrigger id="instructor">
                    <SelectValue placeholder="Select instructor" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors?.map((instructor) => (
                      <SelectItem key={instructor.instructor_id} value={instructor.instructor_id}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="30"
                  min="1"
                />
              </div>
            </div>
            <Button type="submit" disabled={addMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Sections</CardTitle>
          <CardDescription>View and manage course sections</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading sections...</p>
          ) : sections && sections.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section: any) => (
                  <TableRow key={section.section_id}>
                    <TableCell className="font-medium">{section.courses?.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{section.semester}</Badge>
                    </TableCell>
                    <TableCell>{section.year}</TableCell>
                    <TableCell>{section.instructors?.name || "TBA"}</TableCell>
                    <TableCell>{section.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={section.available_seats > 0 ? "default" : "destructive"}>
                        {section.available_seats} / {section.capacity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(section.section_id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No sections found. Add your first section above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SectionsTab;
