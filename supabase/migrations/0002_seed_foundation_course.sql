insert into public.courses (id, slug, title, description, is_published)
values ('00000000-0000-4000-8000-000000000001', 'sight-singing-foundation', '视唱练耳基础课', '从单音、音程、节奏到短旋律的系统练习。', true)
on conflict (slug) do update set title = excluded.title, description = excluded.description, is_published = excluded.is_published;

insert into public.lessons (id, course_id, position, title, description, is_published)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 1, '单音与稳定音高', '建立目标音、参考音和稳定发声的基本方法。', true),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 2, '音程与听辨', '练习辨认、模唱与复练常见音程。', true),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 3, '节奏与短旋律', '把节拍、休止和短旋律阅读组合为练习。', true)
on conflict (course_id, position) do update set title = excluded.title, description = excluded.description, is_published = excluded.is_published;
