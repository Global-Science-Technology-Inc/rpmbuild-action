
# Note that this is NOT a relocateable package

%define name            metlab-yum
%define ver             0.1.1
%define RELEASE         27
%define rel             27
%define prefix          /usr
%define mandir          /usr/man
%define datadir         /usr/share
%define sysconfdir      /etc
%define localstatedir   /var/lib

Summary:    Metlab YUM Server
Name:       %name
Version:    %ver
Release:    %rel
Source:     http://yum.gst.com/packages/%{name}-%{version}.tar.gz
License:    GST Proprietary License
Group:      GST
#BuildArch:  noarch
BuildRoot:  %{_tmppath}/%{name}-%{ver}-root
URL:        http://yum.gst.com/packages/index.html

Requires: epel-release

%description
Metlab YUM Server configuration

Summary: prerequisite packages for the metlab system
Group: Application


#==============================================================================
# preparation section
#==============================================================================

%pre

%prep
%setup -q -n %{name}-%{version}

#==============================================================================
# build section
#==============================================================================

%build
export PATH=`pwd`/pc:$PATH
export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig:`pwd`/pc
%configure --enable-static --enable-shared @RPM_CFG_ARGS@
make %{?_smp_mflags}

#==============================================================================
# install section
#==============================================================================

%install
export PATH=`pwd`/pc:$PATH
export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig:`pwd`/pc

if [ -d %{buildroot} ]; then rm -rf %{buildroot}; fi
make DESTDIR=%{buildroot} install

# new redhat versions don't use .la
##rm -f %{buildroot}%{_libdir}/*.la



#==============================================================================
# cleanup section
#==============================================================================

%post
update-ca-trust extract


%posttrans


%postun


%clean
rm -rf %{buildroot}

#==============================================================================
# files that go into libcast package
#==============================================================================

%files
%defattr(-, root, root)
%doc COPYING AUTHORS README ChangeLog NEWS INSTALL
%{sysconfdir}/pki/ca-trust/source/anchors/SectigoRSAOrganizationValidationSecureServerCA.crt
%{sysconfdir}/yum.repos.d/*
%{_bindir}/yumctl
