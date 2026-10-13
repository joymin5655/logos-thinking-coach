import { describe, expect, it } from 'vitest';
import { TERMS_VERSION } from '../../../../shared/terms';
import { terms as koTerms } from '../../i18n/ko/terms';
import { terms as enTerms } from '../../i18n/en/terms';
import { privacy as koPrivacy } from '../../i18n/ko/privacy';
import { privacy as enPrivacy } from '../../i18n/en/privacy';

// 약관·방침 문구를 바꾸면 시행일과 TERMS_VERSION을 함께 올려야 한다.
describe('TERMS_VERSION', () => {
  it('약관·방침의 시행일 문구와 같다', () => {
    expect(koTerms.effective).toContain(TERMS_VERSION);
    expect(koTerms.s15p1).toContain(TERMS_VERSION);
    expect(enTerms.effective).toContain(TERMS_VERSION);
    expect(enTerms.s15p1).toContain(TERMS_VERSION);
    expect(koPrivacy.effective).toContain(TERMS_VERSION);
    expect(enPrivacy.effective).toContain(TERMS_VERSION);
  });
});
