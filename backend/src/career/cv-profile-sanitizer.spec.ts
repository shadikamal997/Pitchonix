import { sanitizeCvProfile } from './cv-profile-sanitizer';

describe('sanitizeCvProfile content fidelity', () => {
  it('records rejected education nodes instead of silently deleting suspicious technology text', () => {
    const result = sanitizeCvProfile({
      personal: { fullName: 'Shadi Kamal' },
      experience: [],
      education: [
        {
          id: 'edu-1',
          institution: 'JavaScript frameworks and React developer collaboration',
          degree: '',
          field: '',
        },
      ],
      skills: [],
      languages: [],
      projects: [],
      certifications: [],
    } as any);

    expect(result.profile.education).toHaveLength(0);
    expect(result.report.educationFixed).toBe(1);
    expect(result.report.rejectedNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: 'education',
          reason: 'technology_or_skill_fragment',
          value: expect.objectContaining({ id: 'edu-1' }),
        }),
      ]),
    );
  });
});
