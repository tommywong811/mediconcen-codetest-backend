create table mediconcen.user
(
    user_id      int auto_increment
        primary key,
    email        varchar(64)  not null,
    password     varchar(128) not null,
    clinic_name  varchar(64)  not null,
    phone_number varchar(16)  not null,
    address      varchar(128) not null
);

create table mediconcen.record
(
    record_id        int auto_increment
        primary key,
    user_id          int                                not null,
    doctor_name      varchar(64)                        null,
    patient_name     varchar(64)                        null,
    diagnosis        text                               null,
    medication       text                               null,
    consultation_fee float                              null,
    date             datetime default CURRENT_TIMESTAMP null,
    has_follow_up    tinyint(1)                         null,
    constraint record_user_user_id_fk
        foreign key (user_id) references mediconcen.user (user_id)
            on update cascade on delete cascade
);

