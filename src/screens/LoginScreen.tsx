// src/screens/LoginScreen.tsx — production Login screen
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useTheme } from '@/theme';
import { ROLES, type Role } from '@/theme/roles';
import { TextScale } from '@/theme/typography';
import { SUPPORTED_LANGUAGES, setLanguage, i18n, type LanguageCode } from '@/i18n';
import { useLogin } from '@/features/auth/hooks';
import {
  Btn,
  SectionLabel,
  BrandCap,
  LanguagePicker,
  RoleGrid,
  PhoneField,
} from '@/components/ui';
import { Icon } from '@/components/icons';

// Phone validation: strip spaces, must be a valid 10-digit Indian mobile (starts 6-9)
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/);

function stripPhone(raw: string): string {
  return raw.replace(/\s/g, '');
}

function isValidPhone(raw: string): boolean {
  return phoneSchema.safeParse(stripPhone(raw)).success;
}

export const LoginScreen = () => {
  const { t } = useTranslation();
  const { colors, roleKey, setRole } = useTheme();
  const login = useLogin();

  const [selected, setSelected] = useState<Role>(roleKey);
  const [phone, setPhone] = useState('98765 43210');
  const [langOpen, setLangOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const valid = isValidPhone(phone);
  const showError = touched && !valid && phone.length > 0;

  // Derive the native label for the current language
  const currentLang = i18n.language as LanguageCode;
  const languageNative =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.native ?? 'English';

  function handleSelectRole(r: Role) {
    setSelected(r);
    setRole(r);
  }

  function handleSelectLanguage(code: LanguageCode) {
    void setLanguage(code);
    setLangOpen(false);
  }

  function handleChangePhone(v: string) {
    setPhone(v);
    setTouched(true);
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.bg }]}
      edges={['left', 'right', 'bottom']}
    >
      {/* Language picker rendered at screen root (escapes clipped cap) */}
      <LanguagePicker
        visible={langOpen}
        current={currentLang}
        onSelect={handleSelectLanguage}
        onClose={() => setLangOpen(false)}
      />

      {/* Brand cap — sits outside the scroll so it's always visible */}
      <BrandCap
        onPressLanguage={() => setLangOpen(true)}
        languageNative={languageNative}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={[TextScale.hero, { color: colors.ink }]}>
            {t('login.greeting')}
          </Text>
          <Text style={[TextScale.body, { color: colors.inkSoft }]}>
            {t('login.subtitle')}
          </Text>
        </View>

        {/* Role grid */}
        <SectionLabel title={t('login.selectRole')} />
        <RoleGrid selected={selected} onSelect={handleSelectRole} />

        {/* Phone field */}
        <PhoneField
          value={phone}
          onChangeText={handleChangePhone}
          accent={ROLES[selected].accent}
          error={showError ? t('login.invalidPhone') : undefined}
        />

        {/* CTA */}
        <Btn
          testID="login-cta"
          label={t('login.sendOtp')}
          onPress={() => login.mutate({ phone: stripPhone(phone), roleKey: selected })}
          loading={login.isPending}
          disabled={!valid}
          accent={ROLES[selected].accent}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Icon name="lock" size={14} color={colors.inkFaint} strokeWidth={2} />
          <Text style={[TextScale.caption, { color: colors.inkFaint }]}>
            {t('login.securedBy')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 20,
  },
  greetingBlock: {
    gap: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
});
