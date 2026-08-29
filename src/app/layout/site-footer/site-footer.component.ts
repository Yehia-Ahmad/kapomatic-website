import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faDiscord,
  faFacebookF,
  faGithub,
  faInstagram,
  faLinkedinIn,
  faPinterestP,
  faRedditAlien,
  faSnapchat,
  faTelegram,
  faThreads,
  faTiktok,
  faWhatsapp,
  faXTwitter,
  faYoutube
} from '@fortawesome/free-brands-svg-icons';
import { faEnvelope, faLanguage, faLink, faLocationDot, faPhone } from '@fortawesome/free-solid-svg-icons';
import { LocaleService } from '../../core/i18n/locale.service';
import { localizedInternalUrl } from '../../core/security/public-url.utils';
import { HeaderContact, HeaderNavigationItem } from '../../domains/header/header.models';
import { SocialMediaLink } from '../../domains/settings/settings.models';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [FaIconComponent, RouterLink],
  templateUrl: './site-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SiteFooterComponent {
  protected readonly locale = inject(LocaleService);
  protected readonly year = new Date().getFullYear();
  protected readonly icons = {
    envelope: faEnvelope,
    language: faLanguage,
    location: faLocationDot,
    phone: faPhone,
    whatsapp: faWhatsapp
  };

  @Input() logoUrl = '';
  @Input() logoAlt = '';
  @Input() navigation: readonly HeaderNavigationItem[] = [];
  @Input() socialLinks: readonly SocialMediaLink[] = [];
  @Input() contact: HeaderContact = {
    showWhatsapp: false,
    whatsappNumber: '',
    showPhone: false,
    phoneNumber: '',
    showEmail: false,
    email: ''
  };
  @Input() whatsappHref = '';

  protected localizedUrl(item: HeaderNavigationItem): string {
    return localizedInternalUrl(item.url, this.locale.locale());
  }

  protected switchLocale(): void {
    void this.locale.switchLocale(this.locale.locale() === 'ar' ? 'en' : 'ar');
  }

  protected socialIcon(name: string): IconDefinition {
    const key = name.trim().toLowerCase();
    const icons: readonly [readonly string[], IconDefinition][] = [
      [['facebook', 'فيسبوك'], faFacebookF],
      [['instagram', 'انستجرام', 'انستغرام'], faInstagram],
      [['x', 'twitter', 'تويتر'], faXTwitter],
      [['youtube', 'يوتيوب'], faYoutube],
      [['tiktok', 'تيك توك'], faTiktok],
      [['linkedin', 'لينكدإن', 'لينكد ان'], faLinkedinIn],
      [['whatsapp', 'واتساب', 'واتس اب'], faWhatsapp],
      [['telegram', 'تيليجرام', 'تلجرام'], faTelegram],
      [['snapchat', 'سناب شات'], faSnapchat],
      [['pinterest', 'بنترست'], faPinterestP],
      [['threads', 'ثريدز'], faThreads],
      [['discord', 'ديسكورد'], faDiscord],
      [['reddit', 'ريديت'], faRedditAlien],
      [['github', 'جيت هب'], faGithub]
    ];
    return icons.find(([aliases]) => aliases.includes(key))?.[1] ?? faLink;
  }
}
