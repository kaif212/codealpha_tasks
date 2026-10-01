
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by signed in" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'amber',
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;

CREATE OR REPLACE FUNCTION public.is_project_member(_project uuid, _user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM projects WHERE id=_project AND owner_id=_user)
      OR EXISTS (SELECT 1 FROM project_members WHERE project_id=_project AND user_id=_user)
$$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view projects" ON public.projects FOR SELECT TO authenticated USING (public.is_project_member(id, auth.uid()));
CREATE POLICY "create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates" ON public.projects FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner deletes" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid());

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view members" ON public.project_members FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "owner adds members" ON public.project_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id AND p.owner_id=auth.uid()));
CREATE POLICY "owner removes members" ON public.project_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id=project_id AND p.owner_id=auth.uid()) OR user_id = auth.uid());

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assignee_id uuid,
  due_date date,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members all tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_project_member(project_id, auth.uid())) WITH CHECK (public.is_project_member(project_id, auth.uid()));

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view comments" ON public.comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id=task_id AND public.is_project_member(t.project_id, auth.uid())));
CREATE POLICY "members add comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id=task_id AND public.is_project_member(t.project_id, auth.uid())));
CREATE POLICY "delete own comments" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
