// The fixed chapter lists students see in the question bank, in syllabus order.
// A chapter name here is stored as the question's "topic" when the instructor
// uploads chapterwise questions. Subjects not listed have no fixed chapters.
export const CHAPTER_GROUPS = {
  'Aviation Meteorology': [
    { title: '', chapters: [
      'Atmosphere', 'Atmospheric Pressure', 'Temperature', 'Air Density', 'Humidity', 'Winds', 'Visibility and Fog',
      'Vertical Motion and Clouds', 'Stability and Instability of Atmosphere', 'Optical Phenomena', 'Precipitation',
      'Ice Accretion', 'Thunderstorm', 'Air Masses, Fronts and Western Disturbances', 'Jet Streams',
      'Clear Air Turbulence (CAT)', 'Mountain Waves', 'Tropical Systems', 'Climatology', 'General Circulation',
      'Meteorological Services for Aviation', 'METAR and SPECI',
    ] },
  ],
  'Air Navigation': [
    { title: 'Part I — General Navigation', chapters: [
      'The Solar System', 'The Earth', 'Projections', 'Convergency', 'Time', 'Compass and Directions',
      'Distances on Earth Surface', 'Magnetism and Compasses', 'Dead Reckoning Navigation (DR)', 'Measurement of DR Elements',
      'Measurement / Determination of Temperature', 'Measurement of Elements', 'In-flight Navigation',
      'Mass and Balance – Aero Planes', 'Performance', 'Flight Planning and Monitoring – Aero Planes',
    ] },
    { title: 'Part II — Aircraft Instruments', chapters: [
      'Air Data Systems (Pressure Instruments)', 'Altimeter', 'Air Speed Indicator (ASI)', 'Vertical Speed Indicator (VSI)',
      'Gyroscope', 'Inertial Navigation', 'Radio/Radar Altimeter (RADALT) and Alert Systems',
      'Power Plant and System Monitoring Instruments', 'Basics of Electronic Displays',
    ] },
    { title: 'Part III — Radio Navigation', chapters: [
      'Basic Radio Theory', 'ADF / NDB', 'Track and Drift Questions', 'Very High Frequency Omni Direction Radio Range (VOR)',
      'VOR/RMI/ADF Related Questions', 'Holding, Radial Intercept, Bearing to Plot', 'ILS (Instrument Landing System)',
      'Radar', 'Global Navigation Satellite Systems (GNSS)', 'Summary of Navigation Aids and Instruments',
    ] },
  ],
  'Air Regulations': [
    { title: '', chapters: [
      'Definitions and Abbreviations', 'International Organisations and Conventions', 'Aircraft Nationality and Registration Marks',
      'Rules of the Air', 'Air Traffic Services', 'Separation Methods and Minima', 'Separation in the Vicinity of Aerodromes',
      'Procedures for Aerodrome Control Service', 'Use of Air Traffic Services Surveillance System', 'Aeronautical Information Services',
      'Search and Rescue', 'Visual Aids for Navigation', 'Procedures for Air Navigation Services – Aircraft Operations',
      'National Law', 'Personnel Licensing', 'Airworthiness of Aircraft', 'Operational Procedures',
      'Special Operational Procedures and Hazards (General Aspects)', 'Communications', 'Aircraft Accident and Incident',
      'Facilitation', 'Security – Safeguarding International Civil Aviation against Acts of Unlawful Interference',
    ] },
  ],
};

export const chaptersOf = (subject) => (CHAPTER_GROUPS[subject] || []).flatMap((g) => g.chapters);
