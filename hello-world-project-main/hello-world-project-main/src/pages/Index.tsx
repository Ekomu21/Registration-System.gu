import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap, Users, Library, UserPlus, FileText } from "lucide-react";
import StudentsTab from "@/components/tabs/StudentsTab";
import CoursesTab from "@/components/tabs/CoursesTab";
import InstructorsTab from "@/components/tabs/InstructorsTab";
import SectionsTab from "@/components/tabs/SectionsTab";
import RegistrationTab from "@/components/tabs/RegistrationTab";
import TranscriptsTab from "@/components/tabs/TranscriptsTab";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Gulu University</h1>
              <p className="text-sm opacity-90">Course Registration System</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-8">
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="instructors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Instructors</span>
            </TabsTrigger>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">Sections</span>
            </TabsTrigger>
            <TabsTrigger value="registration" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </TabsTrigger>
            <TabsTrigger value="transcripts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Transcripts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <StudentsTab />
          </TabsContent>

          <TabsContent value="courses">
            <CoursesTab />
          </TabsContent>

          <TabsContent value="instructors">
            <InstructorsTab />
          </TabsContent>

          <TabsContent value="sections">
            <SectionsTab />
          </TabsContent>

          <TabsContent value="registration">
            <RegistrationTab />
          </TabsContent>

          <TabsContent value="transcripts">
            <TranscriptsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
