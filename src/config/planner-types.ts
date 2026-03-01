export const plannerTypes = {
  full: {
    id: 'full',
    name: 'Full',
    tagline: 'Everything you need',
    description:
      'Complete planner with 95 templates including calendars, productivity tools, wellness trackers, finance pages, notes, paper types, and games.',
    shortDescription: 'All templates including 29 paper types, games, and every productivity feature.',
    templateCount: 95,
    pageCount: 1660,
    categories: [
      'Yearly, Monthly, Weekly & Daily Calendars',
      'Productivity & To-Do Lists',
      'Finance & Budget Tracking',
      'Wellness & Meal Planning',
      'Habit & Goal Trackers',
      'Reflection & Journaling',
      'Notes (Ruled, Dotted, Cornell)',
      'Paper Types (Grid, Isometric, Music, Hex)',
      'Games (Tic-tac-toe, Connect Four, etc.)',
    ],
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    tagline: 'Productivity essentials',
    description:
      'Streamlined planner with 37 templates focused on productivity, planning, and organization.',
    shortDescription: 'Core calendars, productivity tools, wellness, and selected note types.',
    templateCount: 37,
    pageCount: 882,
    categories: [
      'Yearly, Monthly, Weekly & Daily Calendars',
      'Productivity & To-Do Lists',
      'Wellness & Meal Planning',
      'Habit & Goal Trackers',
      'Notes (Ruled, Dotted, Cornell)',
    ],
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    tagline: 'Clean & simple',
    description:
      'Essential planner with 9 templates for straightforward planning.',
    shortDescription: 'Just the basics: year overview, planners, and birthday tracker.',
    templateCount: 9,
    pageCount: 444,
    categories: [
      'Year Overview & Yearly Planners',
      'Monthly, Weekly & Daily Calendars',
      'Birthday Planner',
    ],
  },
} as const;

export type PlannerTypeId = keyof typeof plannerTypes;
export type PlannerType = (typeof plannerTypes)[PlannerTypeId];
