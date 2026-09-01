// src/screens/LoginScreen.tsx — production Login screen
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useTheme } from '@/theme';
import { ROLES, type Role } from '@/theme/roles';
import { TextScale } from '@/theme/typography';
import { SUPPORTED_LANGUAGES, setLanguage, i18n, type LanguageCode } from '@/i18n';
import { useRequestOtp, useVerifyOtp } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import {
  Btn,
  SectionLabel,
  BrandCap,
  LanguagePicker,
  RoleGrid,
  PhoneField,
  TextField,
} from '@/components/ui';
import { Icon } from '@/components/icons';

type Channel = 'mobile' | 'email';
type Step = 'enter' | 'verify';

// Phone validation: strip spaces, must be a valid 10-digit Indian mobile (starts 6-9)
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/);
const emailSchema = z.string().email();

function stripPhone(raw: string): string {
  return raw.replace(/\s/g, '');
}

function isValidPhone(raw: string): boolean {
  return phoneSchema.safeParse(stripPhone(raw)).success;
}

function isValidEmail(raw: string): boolean {
  return emailSchema.safeParse(raw.trim()).success;
}

export const LoginScreen = () => {
  const { t } = useTranslation();
  const { colors, roleKey, setRole } = useTheme();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [selected, setSelected] = useState<Role>(roleKey);
  const [channel, setChannel] = useState<Channel>('mobile');
  const [step, setStep] = useState<Step>('enter');
  const [phone, setPhone] = useState('98765 43210');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [destination, setDestination] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const identifier = channel === 'mobile' ? stripPhone(phone) : email.trim();
  const valid = channel === 'mobile' ? isValidPhone(phone) : isValidEmail(email);
  const showError = touched && !valid && identifier.length > 0;

  const requestErr = requestOtp.error ? authErrorMessage(requestOtp.error) : null;
  const verifyErr = verifyOtp.error ? authErrorMessage(verifyOtp.error) : null;

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

  function handleChangeChannel(next: Channel) {
    setChannel(next);
    setTouched(false);
    setStep('enter');
    setCode('');
    requestOtp.reset();
    verifyOtp.reset();
  }

  function handleSendOtp() {
    verifyOtp.reset();
    setCode('');
    requestOtp.mutate(identifier, {
      onSuccess: (challenge) => {
        setDestination(challenge.destination);
        setStep('verify');
      },
    });
  }

  function handleVerifyOtp() {
    verifyOtp.mutate({ identifier, code, roleKey: selected });
  }

  function handleChangeIdentifier() {
    setStep('enter');
    setCode('');
    setDestination('');
    verifyOtp.reset();
    requestOtp.reset();
  }

  const accent = ROLES[selected].accent;

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
            {step === 'verify' ? t('login.enterCode') : t('login.subtitle')}
          </Text>
        </View>

        {/* Role grid */}
        <SectionLabel title={t('login.selectRole')} />
        <RoleGrid selected={selected} onSelect={handleSelectRole} />

        {step === 'enter' ? (
          <>
            {/* Mobile / Email channel toggle */}
            <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.sunken }]}>
              <Pressable
                testID="channel-mobile"
                onPress={() => handleChangeChannel('mobile')}
                style={[styles.tab, channel === 'mobile' && { backgroundColor: accent }]}
              >
                <Text
                  style={[
                    TextScale.button,
                    { color: channel === 'mobile' ? colors.onPrimary : colors.inkSoft },
                  ]}
                >
                  {t('login.mobileTab')}
                </Text>
              </Pressable>
              <Pressable
                testID="channel-email"
                onPress={() => handleChangeChannel('email')}
                style={[styles.tab, channel === 'email' && { backgroundColor: accent }]}
              >
                <Text
                  style={[
                    TextScale.button,
                    { color: channel === 'email' ? colors.onPrimary : colors.inkSoft },
                  ]}
                >
                  {t('login.emailTab')}
                </Text>
              </Pressable>
            </View>

            {/* Identifier field */}
            {channel === 'mobile' ? (
              <PhoneField
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setTouched(true);
                }}
                accent={accent}
                error={showError ? t('login.invalidPhone') : undefined}
              />
            ) : (
              <TextField
                testID="email-input"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setTouched(true);
                }}
                accent={accent}
                icon="mail"
                placeholder={t('login.email')}
                keyboardType="email-address"
                error={showError ? t('login.invalidEmail') : undefined}
              />
            )}
            {requestErr && (
              <Text style={[TextScale.caption, { color: colors.danger }]}>{requestErr}</Text>
            )}

            {/* CTA */}
            <Btn
              testID="login-cta"
              label={t('login.sendOtp')}
              onPress={handleSendOtp}
              loading={requestOtp.isPending}
              disabled={!valid}
              accent={accent}
            />
          </>
        ) : (
          <>
            <Text style={[TextScale.caption, styles.codeSentText, { color: colors.inkSoft }]}>
              {t('login.codeSentTo', { destination })}
            </Text>
            <TextField
              testID="otp-input"
              value={code}
              onChangeText={setCode}
              accent={accent}
              icon="keypad"
              placeholder={t('login.enterCode')}
              keyboardType="number-pad"
              maxLength={6}
              error={verifyErr ?? undefined}
            />

            <Btn
              testID="verify-cta"
              label={t('login.verifyOtp')}
              onPress={handleVerifyOtp}
              loading={verifyOtp.isPending}
              disabled={code.length !== 6}
              accent={accent}
            />

            <View style={styles.linksRow}>
              <Pressable onPress={handleSendOtp} disabled={requestOtp.isPending}>
                <Text style={[TextScale.button, { color: accent }]}>{t('login.resend')}</Text>
              </Pressable>
              <Pressable onPress={handleChangeIdentifier}>
                <Text style={[TextScale.button, { color: accent }]}>{t('login.change')}</Text>
              </Pressable>
            </View>
          </>
        )}

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
  tabRow: {
    flexDirection: 'row',
    borderRadius: 100,
    borderWidth: 1.5,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeSentText: {
    marginTop: -8,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
});
